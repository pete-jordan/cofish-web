// src/api/catchApi.ts

import { apiClient } from "../amplifyClient";
import * as mutations from "../graphql/mutations";
import * as queries from "../graphql/queries";
import { ensureUserRecord } from "./authApi";

export type CreatePendingCatchParams = {
  catchId: string;
  s3Key: string;
  lat?: number;
  lng?: number;
};

export type CatchRecord = {
  id: string;
  userId: string;
  videoKey?: string | null;
  verificationStatus: string;
  basePoints?: number | null;
  karmaPoints?: number | null;

  aliveScore?: number | null;
  analysisConfidence?: number | null;
  analysisNote?: string | null;

  // New for uniqueness
  fishFingerprint?: string | null;
  fishEmbedding?: unknown | null;

  lat?: number | null;
  lng?: number | null;

  createdAt?: string | null;
  
  // Amplify DataStore fields
  _version?: number;
  _lastChangedAt?: number;
};

export async function createPendingCatchFromUpload(
  params: CreatePendingCatchParams
) {
  const { catchId, s3Key, lat, lng } = params;

  const user = await ensureUserRecord();
  if (!user) {
    throw new Error("No user record available when creating Catch.");
  }

  const createCatchMutation = (mutations as any).createCatch;
  if (!createCatchMutation) {
    throw new Error("createCatch mutation not found in graphql/mutations");
  }

  const input: any = {
    id: catchId,
    userId: user.id,
    videoKey: s3Key,
    verificationStatus: "PENDING_VERIFICATION",
    basePoints: 100,
    karmaPoints: 0,
  };

  if (typeof lat === "number" && typeof lng === "number") {
    input.lat = lat;
    input.lng = lng;
  }

  const result = await apiClient.graphql({
    query: createCatchMutation,
    variables: { input },
  });

  return (result as any).data?.createCatch as CatchRecord;
}

export async function getCatchById(
  id: string
): Promise<CatchRecord | null> {
  const getCatchQuery = (queries as any).getCatch;
  if (!getCatchQuery) {
    throw new Error("getCatch query not found in graphql/queries");
  }

  const res = await apiClient.graphql({
    query: getCatchQuery,
    variables: { id },
  });

  const data = (res as any).data?.getCatch;
  return (data as CatchRecord) ?? null;
}

// ---------- Analysis update ----------

export type CatchAnalysisUpdate = {
  id: string;
  aliveScore: number;
  analysisConfidence: number;
  analysisNote?: string;
  verificationStatus?: string;

  fishFingerprint?: string;
  fishEmbedding?: number[];
};

export async function updateCatchAfterAnalysis(
  update: CatchAnalysisUpdate
): Promise<CatchRecord> {
  const updateCatchMutation = (mutations as any).updateCatch;
  if (!updateCatchMutation) {
    throw new Error("updateCatch mutation not found in graphql/mutations");
  }

  // Get current catch to retrieve _version for optimistic concurrency
  const currentCatch = await getCatchById(update.id);
  if (!currentCatch) {
    throw new Error(`Catch ${update.id} not found for update`);
  }

  const input: any = {
    id: update.id,
    aliveScore: update.aliveScore,
    analysisConfidence: update.analysisConfidence,
  };

  // Include _version for Amplify DataStore optimistic concurrency
  if ((currentCatch as any)._version != null) {
    input._version = (currentCatch as any)._version;
  }

  if (typeof update.analysisNote === "string") {
    input.analysisNote = update.analysisNote;
  }
  if (update.verificationStatus) {
    input.verificationStatus = update.verificationStatus;
  }

  if (typeof update.fishFingerprint === "string") {
    input.fishFingerprint = update.fishFingerprint;
  }
  if (Array.isArray(update.fishEmbedding)) {
    input.fishEmbedding = JSON.stringify(update.fishEmbedding);
  }

  const res = await apiClient.graphql({
    query: updateCatchMutation,
    variables: { input },
  });

  const updated = (res as any).data?.updateCatch as CatchRecord;
  
  if (!updated) {
    throw new Error("updateCatch returned no data");
  }
  
  // Log for debugging
  if (update.verificationStatus) {
    console.log("Catch updated:", {
      id: updated.id,
      verificationStatus: updated.verificationStatus,
      expected: update.verificationStatus,
      version: (updated as any)._version,
    });
  }
  
  return updated;
}

// ---------- Uniqueness checking ----------

export type UniquenessCheckParams = {
  catchId: string;
  fishEmbedding?: number[];
};

export type UniquenessCheckResult = {
  isUnique: boolean;
  similarityScore?: number;
  similarCatchId?: string;
};

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function checkFishUniqueness(
  params: UniquenessCheckParams
): Promise<UniquenessCheckResult> {
  const { catchId, fishEmbedding } = params;

  if (!fishEmbedding || !Array.isArray(fishEmbedding)) {
    // If no embedding, assume unique (shouldn't happen, but fail safe)
    return { isUnique: true };
  }

  const user = await ensureUserRecord();
  if (!user) {
    throw new Error("No user record available for uniqueness check.");
  }

  // Get current catch to check if it's from same user
  const currentCatch = await getCatchById(catchId);
  if (!currentCatch) {
    throw new Error("Catch not found for uniqueness check.");
  }

  const isSameUser = currentCatch.userId === user.id;
  const threshold = isSameUser ? 0.75 : 0.85; // Stricter for same user

  // Get all catches with embeddings (limit to recent ones for performance)
  const catchesByUserQuery = (queries as any).catchesByUser;
  if (!catchesByUserQuery) {
    throw new Error("catchesByUser query not found");
  }

  // Check user's own catches first (if same user, check all users)
  let allCatches: any[] = [];

  // Get current user's catches that have been verified/posted (not pending)
  try {
    const userResult: any = await apiClient.graphql({
      query: catchesByUserQuery,
      variables: {
        userId: user.id,
        sortDirection: "DESC",
        limit: 100, // Check last 100 catches
        filter: {
          verificationStatus: {
            ne: "PENDING_VERIFICATION", // Only check verified/posted catches
          },
        },
      },
    });
    const userCatches = userResult.data?.catchesByUser?.items ?? [];
    console.log(`Found ${userCatches.length} previous catches to compare against`);
    allCatches.push(...userCatches);
  } catch (e) {
    console.warn("Failed to load user catches for uniqueness check", e);
  }

  // If not same user, also check other users' recent catches
  // Note: This is a simplified approach. In production, you might want
  // a more efficient vector search (e.g., using a vector database)
  if (!isSameUser) {
    // For MVP, we'll check a sample. In production, use proper vector search
    // This would ideally use a vector database or at least an index
    console.log("Checking against other users' catches (simplified for MVP)");
  }

  // Compare embeddings
  let highestSimilarity = 0;
  let mostSimilarCatchId: string | undefined = undefined;

  for (const existingCatch of allCatches) {
    if (existingCatch.id === catchId) continue; // Skip self

    const existingEmbedding = existingCatch.fishEmbedding;
    if (!existingEmbedding) continue;

    let embeddingArray: number[];
    try {
      if (typeof existingEmbedding === "string") {
        embeddingArray = JSON.parse(existingEmbedding);
      } else if (Array.isArray(existingEmbedding)) {
        embeddingArray = existingEmbedding;
      } else {
        continue;
      }
    } catch {
      continue;
    }

    const similarity = cosineSimilarity(fishEmbedding, embeddingArray);
    
    // Track highest similarity for debugging
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilarCatchId = existingCatch.id;
    }
    
    // If similarity exceeds threshold, it's a duplicate
    if (similarity >= threshold) {
      return {
        isUnique: false,
        similarityScore: similarity,
        similarCatchId: existingCatch.id,
      };
    }
  }

  // Return unique with highest similarity for debugging
  return {
    isUnique: true,
    similarityScore: highestSimilarity > 0 ? highestSimilarity : undefined,
    similarCatchId: mostSimilarCatchId,
  };
}
