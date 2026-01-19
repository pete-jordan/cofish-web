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
  let res;
  try {
    res = await fetch(GET_UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType }),
    });
  } catch (fetchError: any) {
    console.error("initCatchUpload fetch error:", fetchError);
    const errorMessage = fetchError?.message || String(fetchError);
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || errorMessage.includes("Load Failed")) {
      throw new Error(`Network error requesting upload URL. Please check your internet connection and try again. Details: ${errorMessage}`);
    } else {
      throw new Error(`Failed to request upload URL: ${errorMessage}`);
    }
  }

  if (!res.ok) {
    let errorText = "";
    try {
      errorText = await res.text();
    } catch (e) {
      errorText = `Could not read error response (status ${res.status})`;
    }
    throw new Error(`initCatchUpload failed with status ${res.status}: ${errorText || "Unknown error"}`);
  }

  let data;
  try {
    data = await res.json();
  } catch (jsonError: any) {
    throw new Error(`Invalid response from upload URL service: ${jsonError?.message || "Could not parse JSON"}`);
  }

  if (!data.uploadUrl || !data.catchId || !data.s3Key) {
    throw new Error(`Invalid response from upload URL service: missing required fields. Received: ${JSON.stringify(data)}`);
  }

  return {
    uploadUrl: data.uploadUrl,
    catchId: data.catchId,
    s3Key: data.s3Key,
  };
}
