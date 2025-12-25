/**
 * Utility to seed dummy catch data for testing TargetZone purchases
 * 
 * Can be called from browser console:
 * import { seedDummyCatches } from './utils/seedCatches';
 * await seedDummyCatches({ email: 'petejordan63@gmail.com', centerLat: 41.1720, centerLng: -71.5778, count: 30, radiusMiles: 15 });
 */

import { apiClient } from "../amplifyClient";
import * as mutations from "../graphql/mutations";
import * as queries from "../graphql/queries";

export interface SeedOptions {
  centerLat: number;
  centerLng: number;
  count?: number;
  radiusMiles?: number;
  email?: string;
  userId?: string;
  species?: string;
}

function randomLocationNear(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): { lat: number; lng: number } {
  const milesToDegLat = 1 / 69;
  const milesToDegLng = 1 / (69 * Math.cos((centerLat * Math.PI) / 180));
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMiles;
  const latOffset = (distance * Math.cos(angle)) * milesToDegLat;
  const lngOffset = (distance * Math.sin(angle)) * milesToDegLng;
  return {
    lat: centerLat + latOffset,
    lng: centerLng + lngOffset,
  };
}

function randomRecentTimestamp(daysAgo: number = 3): string {
  const now = Date.now();
  const daysAgoMs = daysAgo * 24 * 60 * 60 * 1000;
  const randomMs = Math.random() * daysAgoMs;
  return new Date(now - randomMs).toISOString();
}

function generateCatchId(): string {
  return `catch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function findUserByEmail(email: string): Promise<string | null> {
  const listUsersQuery = (queries as any).listUsers;
  if (!listUsersQuery) {
    throw new Error("listUsers query not found");
  }

  try {
    const result: any = await apiClient.graphql({
      query: listUsersQuery,
      variables: {
        filter: {
          email: { eq: email },
        },
        limit: 1,
      },
    });

    const users = result.data?.listUsers?.items ?? [];
    if (users.length > 0) {
      return users[0].id;
    }
    return null;
  } catch (error: any) {
    console.error("Error finding user by email:", error);
    throw new Error(`Failed to find user: ${error?.message || "Unknown error"}`);
  }
}

export async function seedDummyCatches(options: SeedOptions): Promise<void> {
  const {
    centerLat,
    centerLng,
    count = 10,
    radiusMiles = 5,
    email,
    userId: providedUserId,
    species,
  } = options;

  let userId = providedUserId;

  // Find user by email if needed
  if (email && !userId) {
    console.log(`Finding user with email: ${email}...`);
    const foundUserId = await findUserByEmail(email);
    if (!foundUserId) {
      throw new Error(
        `User with email ${email} not found. Please create the user first.`
      );
    }
    userId = foundUserId;
    console.log(`✓ Found user ID: ${userId}`);
  }

  if (!userId) {
    throw new Error("Either userId or email is required.");
  }

  const createCatchMutation = (mutations as any).createCatch;
  if (!createCatchMutation) {
    throw new Error("createCatch mutation not found");
  }

  const speciesList = species
    ? [species]
    : [
        "Striped Bass",
        "Bluefish",
        "Flounder",
        "Black Sea Bass",
        "Tautog",
        "Scup",
        "Weakfish",
      ];

  console.log(`Creating ${count} dummy catches...`);
  console.log(`Center: ${centerLat}, ${centerLng}`);
  console.log(`Radius: ${radiusMiles} miles`);
  console.log(`User ID: ${userId}`);

  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < count; i++) {
    const location = randomLocationNear(centerLat, centerLng, radiusMiles);
    const randomSpecies =
      speciesList[Math.floor(Math.random() * speciesList.length)];
    const createdAt = randomRecentTimestamp(3); // Within last 3 days

    const input: any = {
      id: generateCatchId(),
      userId,
      createdAt,
      species: randomSpecies,
      lat: location.lat,
      lng: location.lng,
      videoKey: `dummy/catch-${i + 1}.mp4`,
      thumbnailKey: `dummy/thumb-${i + 1}.jpg`,
      basePoints: 100,
      karmaPoints: 0,
      verificationStatus: "VERIFIED", // Must be VERIFIED for TargetZone
    };

    try {
      const result: any = await apiClient.graphql({
        query: createCatchMutation,
        variables: { input },
      });

      if (result.data?.createCatch) {
        results.push({ id: input.id, success: true });
        console.log(
          `✓ Created catch ${i + 1}/${count}: ${randomSpecies} at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
        );
      } else {
        results.push({
          id: input.id,
          success: false,
          error: "No data returned",
        });
        console.error(`✗ Failed to create catch ${i + 1}/${count}: No data`);
      }
    } catch (error: any) {
      const errorMsg =
        error?.errors?.[0]?.message || error?.message || "Unknown error";
      results.push({ id: input.id, success: false, error: errorMsg });
      console.error(`✗ Failed to create catch ${i + 1}/${count}:`, errorMsg);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n✅ Created ${successCount}/${count} catches successfully`);

  if (successCount < count) {
    console.log("\nFailed catches:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.id}: ${r.error}`);
      });
  }
}



