// src/utils/debugCatch.ts
// Utility function to debug catch records - check thumbnailKey, videoKey, etc.

import { apiClient } from "../amplifyClient";
import * as queries from "../graphql/queries";

/**
 * Check a catch record by ID to see its fields including thumbnailKey
 * Usage in browser console: await window.debugCatch('catch_1234567890_abc123')
 */
export async function debugCatch(catchId: string) {
  console.log(`🔍 Checking catch record: ${catchId}`);
  
  try {
    const getCatchQuery = (queries as any).getCatch;
    if (!getCatchQuery) {
      throw new Error("getCatch query not found");
    }

    const result: any = await apiClient.graphql({
      query: getCatchQuery,
      variables: { id: catchId },
    });

    const catchRecord = result.data?.getCatch;
    if (!catchRecord) {
      console.error("❌ Catch not found");
      return null;
    }

    console.log("📊 Catch Record Details:");
    console.log("  ID:", catchRecord.id);
    console.log("  User ID:", catchRecord.userId);
    console.log("  Created At:", catchRecord.createdAt);
    console.log("  Species:", catchRecord.species || "(none)");
    console.log("  Location:", catchRecord.lat && catchRecord.lng 
      ? `${catchRecord.lat}, ${catchRecord.lng}` 
      : "(none)");
    console.log("  Video Key:", catchRecord.videoKey || "(none)");
    console.log("  Thumbnail Key:", catchRecord.thumbnailKey || "(none) ⚠️");
    console.log("  Verification Status:", catchRecord.verificationStatus);
    console.log("  Base Points:", catchRecord.basePoints);
    console.log("  Karma Points:", catchRecord.karmaPoints);
    
    // Check S3 bucket info
    if (catchRecord.thumbnailKey) {
      const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
      const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
      const thumbnailUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${catchRecord.thumbnailKey}`;
      console.log("  Thumbnail URL:", thumbnailUrl);
      console.log("  💡 Check S3 bucket for file:", catchRecord.thumbnailKey);
    }
    
    if (catchRecord.videoKey) {
      const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
      const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
      const videoUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${catchRecord.videoKey}`;
      console.log("  Video URL:", videoUrl);
    }

    return catchRecord;
  } catch (error: any) {
    console.error("❌ Error checking catch:", error);
    throw error;
  }
}

// Expose to window for browser console access
if (typeof window !== "undefined") {
  (window as any).debugCatch = debugCatch;
}
