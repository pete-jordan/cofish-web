// src/utils/thumbnailUrl.ts
// Utility to get thumbnail URLs using Amplify Storage

import { getStorageUrl } from "../amplifyClient";

/**
 * Get a thumbnail URL from S3 key using Amplify Storage
 * This properly handles private buckets by generating presigned URLs
 */
export async function getThumbnailUrl(
  thumbnailKey: string | null | undefined,
  videoKey?: string | null
): Promise<string | null> {
  console.log("🖼️ getThumbnailUrl called with:", { thumbnailKey, videoKey });
  
  // If we have a thumbnailKey, use it
  if (thumbnailKey) {
    // If it's already a full URL, return it
    if (thumbnailKey.startsWith("http://") || thumbnailKey.startsWith("https://")) {
      console.log("🖼️ thumbnailKey is already a full URL:", thumbnailKey);
      return thumbnailKey;
    }
    
    try {
      console.log("🖼️ Attempting to get presigned URL for:", thumbnailKey);
      // Use Amplify Storage to get a proper URL (handles private buckets)
      const { url } = await getStorageUrl({
        key: thumbnailKey,
        options: {
          expiresIn: 3600, // 1 hour
        },
      });
      const urlString = url.toString();
      console.log("✅ Got presigned URL from Amplify Storage:", urlString.substring(0, 100) + "...");
      return urlString;
    } catch (error) {
      console.error("❌ Failed to get thumbnail URL from Amplify Storage:", error);
      // Fallback to direct S3 URL (may not work if bucket is private)
      const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
      const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
      const fallbackUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${thumbnailKey}`;
      console.log("🔄 Using fallback direct S3 URL:", fallbackUrl);
      return fallbackUrl;
    }
  }
  
  // If no thumbnailKey but we have videoKey, try to derive thumbnail path
  if (videoKey) {
    const videoKeyWithoutExt = videoKey.replace(/\.(mp4|webm|mov)$/i, "");
    const derivedThumbnailKey = `${videoKeyWithoutExt}_thumb.jpg`;
    
    try {
      const { url } = await getStorageUrl({
        key: derivedThumbnailKey,
        options: {
          expiresIn: 3600,
        },
      });
      return url.toString();
    } catch (error) {
      console.error("Failed to get derived thumbnail URL:", error);
      // Fallback
      const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
      const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
      return `https://${bucketName}.s3.${region}.amazonaws.com/${derivedThumbnailKey}`;
    }
  }
  
  return null;
}

/**
 * Synchronous version that returns a URL string (for use in React components)
 * Note: This may not work for private buckets. Use the async version for proper access.
 */
export function getThumbnailUrlSync(
  thumbnailKey: string | null | undefined,
  videoKey?: string | null
): string | null {
  if (thumbnailKey) {
    if (thumbnailKey.startsWith("http://") || thumbnailKey.startsWith("https://")) {
      return thumbnailKey;
    }
    // For sync version, we'll use direct S3 URL and let the image onError handle failures
    const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
    const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${thumbnailKey}`;
  }
  
  if (videoKey) {
    const videoKeyWithoutExt = videoKey.replace(/\.(mp4|webm|mov)$/i, "");
    const derivedThumbnailKey = `${videoKeyWithoutExt}_thumb.jpg`;
    const bucketName = import.meta.env.VITE_S3_BUCKET_NAME || "amplify-cofishapp-dev-03094-storage-cofishstorage";
    const region = import.meta.env.VITE_AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${derivedThumbnailKey}`;
  }
  
  return null;
}
