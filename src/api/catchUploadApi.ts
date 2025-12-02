// src/api/catchUploadApi.ts

export type CatchUploadInitResponse = {
  uploadUrl: string;
  catchId: string;
  s3Key: string;
};

const GET_UPLOAD_URL =
  import.meta.env.VITE_GET_UPLOAD_URL ||
  "https://kq9ik7tn65.execute-api.us-east-1.amazonaws.com/dev/getUploadUrl";
// ^ Adjust this default path or use the env var in your real API config.

/**
 * Ask the backend for a pre-signed S3 URL to upload a catch video.
 * Backend should:
 *  - authenticate user
 *  - mint a catchId
 *  - create a Catch record with status=PENDING_ANALYSIS
 *  - return uploadUrl + catchId + s3Key
 */
export async function initCatchUpload(
  contentType: string
): Promise<CatchUploadInitResponse> {
  const res = await fetch(GET_UPLOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contentType }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`initCatchUpload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    uploadUrl: data.uploadUrl,
    catchId: data.catchId,
    s3Key: data.s3Key,
  };
}
