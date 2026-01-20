/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_COFISHSTORAGE_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Simple unique-ish ID generator for catch IDs (no external deps)
function makeCatchId() {
  return `catch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const s3 = new S3Client({
  region: process.env.REGION || process.env.AWS_REGION || "us-east-1",
});

exports.handler = async (event) => {
  console.log("getUploadUrl event:", JSON.stringify(event, null, 2));

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const bucketName = process.env.STORAGE_COFISHSTORAGE_BUCKETNAME;
  console.log("Bucket env:", bucketName);

  if (!bucketName) {
    console.error("STORAGE_COFISHSTORAGE_BUCKETNAME is not set");
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error:
          "Bucket env var not configured (STORAGE_COFISHSTORAGE_BUCKETNAME)",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const contentType = body.contentType || "video/webm";
    const uploadType = body.type || "video"; // "video" or "thumbnail"
    const existingCatchId = body.catchId; // For thumbnail uploads

    let catchId, s3Key;
    
    if (uploadType === "thumbnail" && existingCatchId) {
      // Thumbnail upload - use existing catchId
      catchId = existingCatchId;
      s3Key = `catches/${catchId}_thumb.jpg`;
    } else {
      // Video upload - generate new catchId
      catchId = makeCatchId();
      s3Key = `catches/${catchId}.mp4`;
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
    });

    console.log("Signing URL with params:", {
      Bucket: bucketName,
      Key: s3Key,
      ContentType: contentType,
      Type: uploadType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    console.log(`Generated uploadUrl for ${uploadType}, catchId: ${catchId}`);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uploadUrl,
        catchId,
        s3Key,
        ...(uploadType === "thumbnail" && { thumbnailKey: s3Key }),
      }),
    };
  } catch (err) {
    console.error("Error in getUploadUrl handler:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal error in getUploadUrl" }),
    };
  }
};
