// src/api/thumbnailApi.ts
// Functions for creating and uploading thumbnails from video

/**
 * Capture a single frame from a video blob (typically the first frame)
 */
export async function captureThumbnailFrame(videoBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(videoBlob);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Thumbnail capture timed out"));
    }, 10000); // 10 second timeout

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      try {
        // Seek to the beginning (or a small offset like 0.5 seconds)
        video.currentTime = 0.5;
      } catch (err) {
        cleanup();
        reject(new Error(`Failed to set video time: ${err}`));
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          reject(new Error("No 2D canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create thumbnail blob"));
            }
          },
          "image/jpeg",
          0.85 // Quality
        );
      } catch (err) {
        cleanup();
        reject(new Error(`Failed to capture thumbnail: ${err}`));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for thumbnail capture"));
    };

    video.load();
  });
}

/**
 * Get a presigned URL for uploading a thumbnail
 */
async function getThumbnailUploadUrl(
  catchId: string,
  contentType: string = "image/jpeg"
): Promise<{ uploadUrl: string; thumbnailKey: string }> {
  // Use the same endpoint as video upload, but request a thumbnail key
  const GET_UPLOAD_URL =
    import.meta.env.VITE_GET_UPLOAD_URL ||
    "https://kq9ik7tn65.execute-api.us-east-1.amazonaws.com/dev/getUploadUrl";

  const res = await fetch(GET_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType,
      catchId, // Pass catchId so backend can generate matching thumbnail key
      type: "thumbnail", // Indicate this is for a thumbnail
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getThumbnailUploadUrl failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  
  // Backend should return thumbnailKey, but fallback if it doesn't
  const thumbnailKey = data.thumbnailKey || data.s3Key || `catches/${catchId}_thumb.jpg`;

  return {
    uploadUrl: data.uploadUrl,
    thumbnailKey,
  };
}

/**
 * Upload a thumbnail to S3
 */
export async function uploadThumbnail(
  catchId: string,
  thumbnailBlob: Blob
): Promise<string> {
  // 1) Get presigned URL for thumbnail
  const { uploadUrl, thumbnailKey } = await getThumbnailUploadUrl(
    catchId,
    thumbnailBlob.type || "image/jpeg"
  );

  // 2) Upload thumbnail to S3
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: thumbnailBlob,
    headers: {
      "Content-Type": thumbnailBlob.type || "image/jpeg",
    },
  });

  if (!putRes.ok) {
    let errorText = "";
    try {
      errorText = await putRes.text();
    } catch (e) {
      errorText = `Could not read error response (status ${putRes.status})`;
    }
    throw new Error(`Thumbnail upload failed: ${putRes.status} ${errorText}`);
  }

  return thumbnailKey;
}
