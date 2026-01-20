// src/api/authApi.ts
import { apiClient } from "../amplifyClient";

// Amplify v6 auth functions
import {
  signUp as amplifySignUp,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

import * as queries from "../graphql/queries";
import * as mutations from "../graphql/mutations";

type SignUpInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  pointsBalance: number;
  version?: number;
};

export type LedgerEntry = {
  id: string;
  type: "CATCH" | "PURCHASE";
  createdAt: string;
  description: string;
  basePoints?: number;
  karmaPoints?: number;
  totalPoints: number; // positive for catches, negative for purchases
  newBalance: number;  // balance AFTER this entry
};

// ---------- BASIC AUTH ----------

export async function signUp({ email, password, displayName }: SignUpInput) {
  const result = await amplifySignUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name: displayName,
      },
    },
  });

  return result;
}

export async function signIn(email: string, password: string) {
  const result = await amplifySignIn({
    username: email,
    password,
  });

  return result;
}

export async function signOut() {
  await amplifySignOut();
}

// ---------- CURRENT USER HELPERS ----------

export async function getCurrentAuthUser() {
  try {
    const user = await getCurrentUser();
    return user;
  } catch {
    return null;
  }
}

async function getAuthIds() {
  const currentUser = await getCurrentAuthUser();
  if (!currentUser) return null;

  let sub: string | undefined = currentUser.userId;
  let email: string | undefined;

  try {
    const session = await fetchAuthSession();
    const tokens: any = session.tokens ?? {};
    const idPayload = tokens.idToken?.payload ?? {};

    sub = idPayload.sub ?? sub;
    email = idPayload.email ?? email;
  } catch (e) {
    console.warn("getAuthIds: fetchAuthSession failed, falling back:", e);
  }

  if (!sub) {
    console.warn("getAuthIds: no sub / userId found");
    return null;
  }

  return { sub, email };
}

// ---------- USER RECORD CREATION ----------

export async function ensureUserRecord() {
  try {
    const ids = await getAuthIds();
    if (!ids) return null;
    const { sub, email } = ids;

    const getUserQuery = (queries as any).getUser;
    if (!getUserQuery) {
      console.warn("getUser query not found in graphql/queries");
      return null;
    }

    const result: any = await apiClient.graphql({
      query: getUserQuery,
      variables: { id: sub },
    });

    let user = result.data?.getUser;

    if (!user) {
      const createUserMutation = (mutations as any).createUser;
      if (!createUserMutation) {
        console.warn("createUser mutation not found in graphql/mutations");
        return null;
      }

      const createResult: any = await apiClient.graphql({
        query: createUserMutation,
        variables: {
          input: {
            id: sub,
            email: email ?? "unknown@example.com",
            displayName: email ?? "Unknown Angler",
            pointsBalance: 0,
          },
        },
      });

      user = createResult.data?.createUser;
    }

    return user;
  } catch (e) {
    console.warn("ensureUserRecord failed:", e);
    return null;
  }
}

export async function getCurrentUserProfileWithBalance(): Promise<UserProfile | null> {
  const user = await ensureUserRecord();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    pointsBalance: user.pointsBalance ?? 0,
    version: user._version,
  };
}

// ---------- SIMULATED CATCH (+100 POINTS) ----------

export async function simulateCatchAndAwardPoints() {
  const profile = await getCurrentUserProfileWithBalance();
  if (!profile) {
    throw new Error("Not signed in");
  }

  const createCatchMutation = (mutations as any).createCatch;
  const updateUserMutation = (mutations as any).updateUser;

  if (!createCatchMutation) {
    throw new Error("createCatch mutation not found");
  }
  if (!updateUserMutation) {
    throw new Error("updateUser mutation not found");
  }

  // 1) Create Catch with dummy data (MVP)
  let createdCatch: any;
  try {
    const catchResult: any = await apiClient.graphql({
      query: createCatchMutation,
      variables: {
        input: {
          userId: profile.id,
          species: "Striped Bass",
          lat: 0.0,
          lng: 0.0,
          videoKey: "dummy/video-key.mp4",
          thumbnailKey: "dummy/thumbnail.jpg",
          basePoints: 100,
          karmaPoints: 0,
          verificationStatus: "PENDING_VERIFICATION",
        },
      },
    });
    createdCatch = catchResult.data?.createCatch;
  } catch (e: any) {
    console.error("simulateCatchAndAwardPoints: createCatch failed", e);
    const msg =
      e?.errors?.[0]?.message ||
      e?.message ||
      "Failed to create catch.";
    throw new Error(msg);
  }

  if (!createdCatch) {
    throw new Error("createCatch returned no data");
  }

  // 2) Update user points balance
  const current = profile.pointsBalance ?? 0;
  const newBalance = current + 100;

  const updateInput: any = {
    id: profile.id,
    pointsBalance: newBalance,
  };

  if (profile.version != null) {
    updateInput._version = profile.version;
  }

  let updatedUser: any;
  try {
    const updateResult: any = await apiClient.graphql({
      query: updateUserMutation,
      variables: { input: updateInput },
    });
    updatedUser = updateResult.data?.updateUser;
  } catch (e: any) {
    console.error("simulateCatchAndAwardPoints: updateUser failed", e);
    const msg =
      e?.errors?.[0]?.message ||
      e?.message ||
      "Failed to update user points balance.";
    throw new Error(msg);
  }

  // 3) Try to award karma to prior helpers (MVP)
  try {
    await awardKarmaForNewCatch(createdCatch);
  } catch (e) {
    console.warn("simulateCatchAndAwardPoints: awardKarmaForNewCatch failed", e);
  }

  const finalBalance = updatedUser?.pointsBalance ?? newBalance;

  return {
    user: updatedUser ?? { ...profile, pointsBalance: finalBalance },
    pointsBalance: finalBalance,
  };
}

// ---------- PURCHASE TARGETZONE (DEBIT POINTS) ----------

export async function purchaseTargetZone({
  radiusMiles,
  baseCostPoints,
  speciesFilter,
  centerLat,
  centerLng,
}: {
  radiusMiles: number;      // 2 for standard, 1 for precision
  baseCostPoints: number;   // 100 or 300
  speciesFilter?: string;
  centerLat: number;
  centerLng: number;
}) {
  const profile = await getCurrentUserProfileWithBalance();
  if (!profile) {
    throw new Error("Not signed in");
  }

  const createPurchaseMutation = (mutations as any).createInfoPurchase;
  const updateUserMutation = (mutations as any).updateUser;
  const listCatchesQuery = (queries as any).listCatches;

  if (!createPurchaseMutation) {
    throw new Error("createInfoPurchase mutation not found");
  }
  if (!updateUserMutation) {
    throw new Error("updateUser mutation not found");
  }

  const discountPercent = 0;
  const finalCostPoints = baseCostPoints;

  const currentBalance = profile.pointsBalance ?? 0;
  if (currentBalance < finalCostPoints) {
    throw new Error(
      `Not enough points to purchase this TargetZone. You have ${currentBalance}, need ${finalCostPoints}.`
    );
  }

  // Find catches within the purchased radius for karma tracking
  let includedCatchIds: string[] | null = null;
  let avgAgeHours: number | null = null;

  try {
    // Get catches within the purchase radius (within last 30 days for relevance)
    const hoursBack = 24 * 30; // 30 days
    const nearbyCatches = await getNearbyCatches({
      centerLat,
      centerLng,
      radiusMiles,
      hoursBack,
    });

    // Apply species filter if provided by fetching catch records and filtering client-side
    let filteredCatches = nearbyCatches;
    if (speciesFilter && nearbyCatches.length > 0) {
      const listCatchesQuery = (queries as any).listCatches;
      if (listCatchesQuery) {
        try {
          // Fetch catch records for nearby catches to check species
          const result: any = await apiClient.graphql({
            query: listCatchesQuery,
            variables: {
              limit: 500, // Get enough to cover nearby catches
            },
          });
          const items: any[] = result.data?.listCatches?.items ?? [];
          
          // Create a map of catch ID to species
          const catchSpeciesMap = new Map<string, string | null>();
          items.forEach((item) => {
            if (item.id && nearbyCatches.some((c) => c.id === item.id)) {
              catchSpeciesMap.set(item.id, item.species || null);
            }
          });

          // Filter to only catches matching the species filter
          filteredCatches = nearbyCatches.filter((c) => {
            const species = catchSpeciesMap.get(c.id);
            return species && species.toLowerCase() === speciesFilter.toLowerCase();
          });
        } catch (e) {
          console.warn("purchaseTargetZone: species filter failed", e);
          // Continue without species filter if query fails
        }
      }
    }

    if (filteredCatches.length > 0) {
      includedCatchIds = filteredCatches.map((c) => c.id);

      // Calculate average age of included catches
      const now = Date.now();
      const totalHours = filteredCatches.reduce((sum, c) => {
        try {
          const created = new Date(c.createdAt).getTime();
          const hours = (now - created) / (1000 * 60 * 60);
          return sum + hours;
        } catch {
          return sum;
        }
      }, 0);

      avgAgeHours = totalHours / filteredCatches.length;
    }
  } catch (e) {
    console.warn("purchaseTargetZone: getNearbyCatches failed", e);
    // Continue without includedCatchIds if location filtering fails
  }

  // 3) Create InfoPurchase
  let createdPurchase: any;
  try {
    const purchaseResult: any = await apiClient.graphql({
      query: createPurchaseMutation,
      variables: {
        input: {
          userId: profile.id,
          centerLat,
          centerLng,
          radiusMiles,
          speciesFilter: speciesFilter ?? null,
          baseCostPoints,
          discountPercent,
          finalCostPoints,
          avgAgeHours,
          includedCatchIds,
        },
      },
    });

    createdPurchase = purchaseResult.data?.createInfoPurchase;
  } catch (e: any) {
    console.error("purchaseTargetZone: createInfoPurchase failed", e);
    throw new Error(
      e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to create InfoPurchase."
    );
  }

  if (!createdPurchase) {
    throw new Error("createInfoPurchase returned no data");
  }

  // 4) Deduct user points
  const newBalance = currentBalance - finalCostPoints;

  const updateInput: any = {
    id: profile.id,
    pointsBalance: newBalance,
  };

  if (profile.version != null) {
    updateInput._version = profile.version;
  }

  let updatedUser: any;
  try {
    const updateResult: any = await apiClient.graphql({
      query: updateUserMutation,
      variables: { input: updateInput },
    });
    updatedUser = updateResult.data?.updateUser;
  } catch (e: any) {
    console.error("purchaseTargetZone: updateUser failed", e);
    throw new Error(
      e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to update points balance."
    );
  }

  return {
    purchase: createdPurchase,
    newBalance,
    updatedUser,
  };
}

// ---------- KARMA HELPERS ----------

/**
 * Distance threshold (in miles) for awarding karma points.
 * A new catch must be within this distance of a source catch to award karma.
 * This is independent of the target zone purchase radius.
 */
const KARMA_PROXIMITY_RADIUS_MILES = 2;

export async function awardKarmaToCatch(catchId: string, amount: number = 50) {
  const getCatchQuery = (queries as any).getCatch;
  const updateCatchMutation = (mutations as any).updateCatch;
  const getUserQuery = (queries as any).getUser;
  const updateUserMutation = (mutations as any).updateUser;

  if (!getCatchQuery || !updateCatchMutation) {
    throw new Error("Catch queries/mutations not found.");
  }
  if (!getUserQuery || !updateUserMutation) {
    throw new Error("User queries/mutations not found.");
  }

  // 1) Load Catch
  let catchRecord: any;
  try {
    const result: any = await apiClient.graphql({
      query: getCatchQuery,
      variables: { id: catchId },
    });
    catchRecord = result.data?.getCatch;
  } catch (e: any) {
    console.error("awardKarmaToCatch: getCatch failed", e);
    throw new Error(
      e?.errors?.[0]?.message || e?.message || "Failed to load catch."
    );
  }

  if (!catchRecord) {
    throw new Error("Catch not found.");
  }

  const currentKarma = catchRecord.karmaPoints ?? 0;
  const newKarma = currentKarma + amount;

  // 2) Update Catch
  let updatedCatch: any;
  try {
    const updateResult: any = await apiClient.graphql({
      query: updateCatchMutation,
      variables: {
        input: {
          id: catchRecord.id,
          karmaPoints: newKarma,
          _version: catchRecord._version,
        },
      },
    });
    updatedCatch = updateResult.data?.updateCatch;
  } catch (e: any) {
    console.error("awardKarmaToCatch: updateCatch failed", e);
    throw new Error(
      e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to update catch karma."
    );
  }

  // 3) Update user points
  const userId = catchRecord.userId;
  let userRecord: any;
  try {
    const userResult: any = await apiClient.graphql({
      query: getUserQuery,
      variables: { id: userId },
    });
    userRecord = userResult.data?.getUser;
  } catch (e: any) {
    console.error("awardKarmaToCatch: getUser failed", e);
    throw new Error(
      e?.errors?.[0]?.message || e?.message || "Failed to load user."
    );
  }

  if (!userRecord) {
    throw new Error("User not found for this catch.");
  }

  const currentBalance = userRecord.pointsBalance ?? 0;
  const newBalance = currentBalance + amount;

  let updatedUser: any;
  try {
    const updateResult: any = await apiClient.graphql({
      query: updateUserMutation,
      variables: {
        input: {
          id: userRecord.id,
          pointsBalance: newBalance,
          _version: userRecord._version,
        },
      },
    });
    updatedUser = updateResult.data?.updateUser;
  } catch (e: any) {
    console.error("awardKarmaToCatch: updateUser failed", e);
    throw new Error(
      e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to update user points balance."
    );
  }

  return {
    catch: updatedCatch ?? { ...catchRecord, karmaPoints: newKarma },
    user: updatedUser ?? { ...userRecord, pointsBalance: newBalance },
    newKarma,
    newBalance,
  };
}

export async function awardKarmaForNewCatch(catchRecord: any) {
  const purchasesByUserQuery = (queries as any).purchasesByUser;
  if (!purchasesByUserQuery) {
    console.warn("awardKarmaForNewCatch: purchasesByUser query not found");
    return;
  }

  const userId = catchRecord.userId;
  const createdAtStr: string = catchRecord.createdAt;
  const catchCreatedAt = createdAtStr ? new Date(createdAtStr) : new Date();
  const oneWeekAgo = new Date(
    catchCreatedAt.getTime() - 7 * 24 * 60 * 60 * 1000
  );

  let purchases: any[] = [];
  try {
    const result: any = await apiClient.graphql({
      query: purchasesByUserQuery,
      variables: {
        userId,
        createdAt: { ge: oneWeekAgo.toISOString() },
        sortDirection: "DESC",
        limit: 50,
      },
    });

    purchases = result.data?.purchasesByUser?.items ?? [];
  } catch (e: any) {
    console.warn("awardKarmaForNewCatch: purchasesByUser failed", e);
    return;
  }

  if (!purchases.length) {
    return;
  }

  // Get the new catch's location
  const newCatchLat = catchRecord.lat;
  const newCatchLng = catchRecord.lng;
  
  if (!newCatchLat || !newCatchLng) {
    console.warn("awardKarmaForNewCatch: new catch missing location, cannot award karma");
    return;
  }

  const getCatchQuery = (queries as any).getCatch;
  if (!getCatchQuery) {
    console.warn("awardKarmaForNewCatch: getCatch query not found");
    return;
  }

  const awardedCatchIds = new Set<string>();

  for (const purchase of purchases) {
    const included: string[] = purchase.includedCatchIds ?? [];
    
    for (const sourceCatchId of included) {
      if (!sourceCatchId || awardedCatchIds.has(sourceCatchId)) continue;
      
      try {
        // Fetch the source catch to get its location
        const sourceCatchResult: any = await apiClient.graphql({
          query: getCatchQuery,
          variables: { id: sourceCatchId },
        });
        const sourceCatch = sourceCatchResult.data?.getCatch;
        
        if (!sourceCatch) {
          console.warn(`awardKarmaForNewCatch: source catch ${sourceCatchId} not found`);
          continue;
        }
        
        const sourceCatchLat = sourceCatch.lat;
        const sourceCatchLng = sourceCatch.lng;
        
        if (!sourceCatchLat || !sourceCatchLng) {
          console.warn(`awardKarmaForNewCatch: source catch ${sourceCatchId} missing location`);
          continue;
        }
        
        // Check if new catch is within karma proximity radius of source catch
        const distanceMiles = haversineMiles(
          newCatchLat,
          newCatchLng,
          sourceCatchLat,
          sourceCatchLng
        );
        
        if (distanceMiles <= KARMA_PROXIMITY_RADIUS_MILES) {
          // New catch is near the source catch - award karma
          awardedCatchIds.add(sourceCatchId);
          await awardKarmaToCatch(sourceCatchId, 50);
          console.log(
            `awardKarmaForNewCatch: awarded karma to catch ${sourceCatchId} ` +
            `(distance: ${distanceMiles.toFixed(2)} miles, karma radius: ${KARMA_PROXIMITY_RADIUS_MILES} miles)`
          );
        } else {
          console.log(
            `awardKarmaForNewCatch: skipped catch ${sourceCatchId} ` +
            `(distance: ${distanceMiles.toFixed(2)} miles > karma radius: ${KARMA_PROXIMITY_RADIUS_MILES} miles)`
          );
        }
      } catch (e) {
        console.warn(
          "awardKarmaForNewCatch: failed to process source catch",
          sourceCatchId,
          e
        );
      }
    }
  }
}

// ---------- AWARD POINTS FOR VERIFIED CATCH ----------

export async function awardPointsForVerifiedCatch(catchId: string) {
  const getCatchQuery = (queries as any).getCatch;
  const updateCatchMutation = (mutations as any).updateCatch;
  const getUserQuery = (queries as any).getUser;
  const updateUserMutation = (mutations as any).updateUser;

  if (!getCatchQuery || !updateCatchMutation) {
    throw new Error("Catch queries/mutations not found.");
  }
  if (!getUserQuery || !updateUserMutation) {
    throw new Error("User queries/mutations not found.");
  }

  // 1) Load Catch
  let catchRecord: any;
  try {
    const result: any = await apiClient.graphql({
      query: getCatchQuery,
      variables: { id: catchId },
    });
    catchRecord = result.data?.getCatch;
  } catch (e: any) {
    console.error("awardPointsForVerifiedCatch: getCatch failed", e);
    throw new Error(
      e?.errors?.[0]?.message || e?.message || "Failed to load catch."
    );
  }

  if (!catchRecord) {
    throw new Error("Catch not found.");
  }

  if (catchRecord.verificationStatus !== "VERIFIED") {
    throw new Error("Catch is not verified.");
  }

  // 2) Update Catch status to AWARDED
  try {
    await apiClient.graphql({
      query: updateCatchMutation,
      variables: {
        input: {
          id: catchRecord.id,
          verificationStatus: "AWARDED",
          _version: catchRecord._version,
        },
      },
    });
  } catch (e: any) {
    console.error("awardPointsForVerifiedCatch: updateCatch failed", e);
    throw new Error(
      e?.errors?.[0]?.message || e?.message || "Failed to update catch."
    );
  }

  // 3) Award points to user
  const userId = catchRecord.userId;
  let userRecord: any;
  try {
    const userResult: any = await apiClient.graphql({
      query: getUserQuery,
      variables: { id: userId },
    });
    userRecord = userResult.data?.getUser;
  } catch (e: any) {
    console.error("awardPointsForVerifiedCatch: getUser failed", e);
    throw new Error(
      e?.errors?.[0]?.message || e?.message || "Failed to load user."
    );
  }

  if (!userRecord) {
    throw new Error("User not found for this catch.");
  }

  const currentBalance = userRecord.pointsBalance ?? 0;
  const pointsToAward = catchRecord.basePoints ?? 100;
  const newBalance = currentBalance + pointsToAward;

  try {
    await apiClient.graphql({
      query: updateUserMutation,
      variables: {
        input: {
          id: userRecord.id,
          pointsBalance: newBalance,
          _version: userRecord._version,
        },
      },
    });
  } catch (e: any) {
    console.error("awardPointsForVerifiedCatch: updateUser failed", e);
    throw new Error(
      e?.errors?.[0]?.message ||
        e?.message ||
        "Failed to update user points balance."
    );
  }

  // 4) Award karma to catches that helped this user (non-blocking)
  try {
    await awardKarmaForNewCatch(catchRecord);
  } catch (e) {
    // Don't fail the whole operation if karma fails
    console.warn("awardPointsForVerifiedCatch: awardKarmaForNewCatch failed", e);
  }

  return {
    pointsAwarded: pointsToAward,
    newBalance,
  };
}

// ---------- LEDGER / POINTS HISTORY ----------

export async function getUserLedger(): Promise<{
  profile: UserProfile;
  entries: LedgerEntry[];
}> {
  const profile = await getCurrentUserProfileWithBalance();
  if (!profile) {
    throw new Error("Not signed in");
  }

  const catchesByUserQuery = (queries as any).catchesByUser;
  const purchasesByUserQuery = (queries as any).purchasesByUser;

  if (!catchesByUserQuery || !purchasesByUserQuery) {
    throw new Error("catchesByUser or purchasesByUser query not found");
  }

  // 1) Load catches
  let catchItems: any[] = [];
  try {
    const result: any = await apiClient.graphql({
      query: catchesByUserQuery,
      variables: {
        userId: profile.id,
        sortDirection: "DESC",
        limit: 100,
      },
    });
    catchItems = result.data?.catchesByUser?.items ?? [];
  } catch (e) {
    console.warn("getUserLedger: catchesByUser failed", e);
  }

  // 2) Load purchases
  let purchaseItems: any[] = [];
  try {
    const result: any = await apiClient.graphql({
      query: purchasesByUserQuery,
      variables: {
        userId: profile.id,
        sortDirection: "DESC",
        limit: 100,
      },
    });
    purchaseItems = result.data?.purchasesByUser?.items ?? [];
  } catch (e) {
    console.warn("getUserLedger: purchasesByUser failed", e);
  }

  // 3) Build events with deltas
  type Event = {
    id: string;
    type: "CATCH" | "PURCHASE";
    createdAt: string;
    description: string;
    basePoints?: number;
    karmaPoints?: number;
    deltaPoints: number;
  };

  const events: Event[] = [];

  for (const c of catchItems) {
    const basePoints = c.basePoints ?? 0;
    const karmaPoints = c.karmaPoints ?? 0;
    const total = basePoints + karmaPoints;

    events.push({
      id: c.id,
      type: "CATCH",
      createdAt: c.createdAt,
      description: c.species
        ? `Catch — ${c.species}`
        : "Catch — (unknown species)",
      basePoints,
      karmaPoints,
      deltaPoints: total,
    });
  }

  for (const p of purchaseItems) {
    const finalCost = p.finalCostPoints ?? p.baseCostPoints ?? 0;
    const radius = p.radiusMiles ?? 0;
    const label =
      radius === 1
        ? "Precision TargetZone"
        : radius === 2
        ? "Standard TargetZone"
        : "TargetZone";

    events.push({
      id: p.id,
      type: "PURCHASE",
      createdAt: p.createdAt,
      description: `${label}`,
      deltaPoints: -finalCost,
    });
  }

  // 4) Sort events DESC by createdAt (newest first)
  events.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return tb - ta;
  });

  // 5) Compute running balance backward from current profile.pointsBalance
  const entries: LedgerEntry[] = [];
  let runningBalance = profile.pointsBalance ?? 0;

  for (const ev of events) {
    const newBalance = runningBalance; // balance AFTER this event
    const totalPoints = ev.deltaPoints;

    entries.push({
      id: ev.id,
      type: ev.type,
      createdAt: ev.createdAt,
      description: ev.description,
      basePoints: ev.basePoints,
      karmaPoints: ev.karmaPoints,
      totalPoints,
      newBalance,
    });

    runningBalance -= ev.deltaPoints;
  }

  return { profile, entries };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const current = await getCurrentUser();

    if (!current?.userId) return null;
    const id = current.userId;

    const result: any = await apiClient.graphql({
      query: queries.getUser,
      variables: { id },
    });

    return result?.data?.getUser ?? null;
  } catch (err) {
    console.warn("getUserProfile failed:", err);
    return null;
  }
}

// ---------- NEARBY CATCHES FOR TARGET ZONES ----------

type RawCatchItem = {
  id: string;
  userId: string;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  _deleted?: boolean | null;
};

export type NearbyCatch = {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  createdAt: string;
};

// Rough Haversine in miles
function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch catches near a center point, within radiusMiles, newer than hoursBack,
 * excluding the current user's own catches.
 */
export async function getNearbyCatches(params: {
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  hoursBack: number;
}): Promise<NearbyCatch[]> {
  const { centerLat, centerLng, radiusMiles, hoursBack } = params;

  const now = Date.now();
  const cutoff = now - hoursBack * 60 * 60 * 1000;

  // Who is the current user?
  let currentUserId: string | null = null;
  try {
    const current = await getCurrentUser();
    currentUserId = current?.userId ?? null;
  } catch (e) {
    console.warn("getNearbyCatches: getCurrentUser failed:", e);
  }

  const listCatchesQuery = (queries as any).listCatches;
  if (!listCatchesQuery) {
    console.warn("listCatches query not found in graphql/queries.js");
    return [];
  }

  try {
    const result: any = await apiClient.graphql({
      query: listCatchesQuery,
      variables: {
        limit: 500, // MVP: simple, client-side filtering
      },
    });

    const items: RawCatchItem[] =
      result?.data?.listCatches?.items ?? [];

    const filtered = items
      .filter((i) => !i._deleted)
      .filter((i) => i.lat != null && i.lng != null)
      .filter((i) => !currentUserId || i.userId !== currentUserId)
      .filter((i) => {
        const t = new Date(i.createdAt).getTime();
        return !Number.isNaN(t) && t >= cutoff;
      })
      .filter((i) => {
        return (
          haversineMiles(
            centerLat,
            centerLng,
            i.lat as number,
            i.lng as number
          ) <= radiusMiles
        );
      })
      .map((i) => ({
        id: i.id,
        userId: i.userId,
        lat: i.lat as number,
        lng: i.lng as number,
        createdAt: i.createdAt,
      }));

    return filtered;
  } catch (e) {
    console.error("getNearbyCatches: GraphQL error:", e);
    return [];
  }
}

/**
 * DEV ONLY: Seed some fake catches around Block Island
 * so TargetZones previews have something to find.
 */
export async function seedDemoCatchesAroundBlockIsland() {
  const createCatchMutation = (mutations as any).createCatch;
  if (!createCatchMutation) {
    console.warn("createCatch mutation not found in graphql/mutations.js");
    return;
  }

  // Approx Block Island center
  const baseLat = 41.1700;
  const baseLng = -71.5600;

  // Fake demo user – not your current user
  const demoUserId = "DEMO-USER-BI-1";

  const now = Date.now();
  const catchesToCreate = 12; // "HIGH" bucket

  const createOne = async (i: number) => {
    // small random spread within ~3 miles
    const randMilesLat = (Math.random() - 0.5) * 6; // -3..+3
    const randMilesLng = (Math.random() - 0.5) * 6;

    const milesToDegLat = (m: number) => m / 69;
    const milesToDegLng = (m: number, lat: number) =>
      m / (69 * Math.cos((lat * Math.PI) / 180));

    const lat = baseLat + milesToDegLat(randMilesLat);
    const lng = baseLng + milesToDegLng(randMilesLng, baseLat);

    const createdAt = new Date(now - i * 3 * 60 * 60 * 1000).toISOString(); // each 3 hours apart

    const input = {
      userId: demoUserId,
      species: "Striped Bass",
      lat,
      lng,
      videoKey: "demo/video-key.mp4",
      thumbnailKey: "demo/thumbnail.jpg",
      basePoints: 100,
      karmaPoints: 0,
      verificationStatus: "PENDING_VERIFICATION",
      createdAt,
    };

    await apiClient.graphql({
      query: createCatchMutation,
      variables: { input },
    });
  };

  for (let i = 0; i < catchesToCreate; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await createOne(i);
    } catch (e) {
      console.error("seedDemoCatchesAroundBlockIsland error:", e);
    }
  }

  console.log("Seeded demo Block Island catches.");
}
