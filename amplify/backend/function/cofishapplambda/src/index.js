// amplify/backend/function/cofishapplambda/src/index.js

// Ensure fetch is available (Node.js 18+ has it globally, but adding check for safety)
if (typeof fetch === 'undefined') {
  console.error("ERROR: fetch is not available in this runtime");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
};

exports.handler = async (event) => {
  console.log("analyzeVideo event:", JSON.stringify(event, null, 2));

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

  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not set");
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const body = JSON.parse(event.body);
    const frames = body.frames; // Array of frame data URLs

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing or invalid 'frames' field (must be array)",
        }),
      };
    }

    console.log(`Received ${frames.length} frames for analysis`);

    // Analyze all frames
    let frameResults;
    try {
      frameResults = await Promise.all(
        frames.map((frameDataUrl) => callOpenAiForLiveness(frameDataUrl))
      );
      console.log(`Successfully analyzed ${frameResults.length} frames`);
    } catch (frameError) {
      console.error("Error analyzing frames:", frameError);
      throw new Error(`Frame analysis failed: ${frameError?.message || frameError}`);
    }

    // Aggregate results
    let aggregated;
    try {
      aggregated = aggregateFrameResults(frameResults);
      console.log("Aggregated results:", JSON.stringify(aggregated, null, 2));
    } catch (aggError) {
      console.error("Error aggregating results:", aggError);
      throw new Error(`Aggregation failed: ${aggError?.message || aggError}`);
    }
    let { aliveScore, confidence, explanation, fishFingerprint, species } = aggregated;

    let fishEmbedding = undefined;

    // If we got a fingerprint, ask OpenAI for an embedding
    if (fishFingerprint && typeof fishFingerprint === "string") {
      try {
        fishEmbedding = await getFingerprintEmbedding(fishFingerprint);
      } catch (err) {
        console.error("Error getting embedding for fingerprint:", err);
      }
    }


    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        aliveScore,
        confidence,
        explanation,
        fishFingerprint,
        fishEmbedding,
        species,
      }),
    };
  } catch (err) {
    console.error("analyzeVideo ERROR:", err);
    console.error("Error stack:", err?.stack);
    console.error("Error message:", err?.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: "Analysis failed in Lambda",
        message: err?.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? err?.stack : undefined
      }),
    };
  }
};

/**
 * Aggregate results from multiple frames
 */
function aggregateFrameResults(frameResults) {
  const aliveScores = [];
  const confidences = [];
  const explanations = [];
  const fingerprints = [];
  const speciesList = [];

  for (const result of frameResults) {
    const normalized = normalizeLivenessResult(result);
    aliveScores.push(normalized.aliveScore);
    confidences.push(normalized.confidence);
    if (normalized.explanation) {
      explanations.push(normalized.explanation);
    }
    if (normalized.fishFingerprint) {
      fingerprints.push(normalized.fishFingerprint);
    }
    if (normalized.species) {
      speciesList.push(normalized.species);
    }
  }

  // Average alive scores and confidences
  const avgAliveScore =
    aliveScores.reduce((a, b) => a + b, 0) / aliveScores.length;
  const avgConfidence =
    confidences.reduce((a, b) => a + b, 0) / confidences.length;

  // Use most common species (or first if all different)
  const speciesCounts = {};
  for (const s of speciesList) {
    speciesCounts[s] = (speciesCounts[s] || 0) + 1;
  }
  let mostCommonSpecies = "";
  let maxCount = 0;
  for (const [s, count] of Object.entries(speciesCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonSpecies = s;
    }
  }
  const species = mostCommonSpecies || (speciesList.length > 0 ? speciesList[0] : "");

  // Use most common fingerprint, or combine them
  const fingerprint =
    fingerprints.length > 0
      ? fingerprints[0] // For now, use first. Could improve with consensus
      : "";

  // Combine explanations
  const explanation =
    explanations.length > 0
      ? `Analyzed ${frameResults.length} frames. ${explanations.join(" ")}`
      : "Multi-frame analysis completed.";

  return {
    aliveScore: avgAliveScore,
    confidence: avgConfidence,
    explanation,
    fishFingerprint: fingerprint,
    species,
  };
}

/**
 * Call OpenAI Vision on a single frame.
 * We ask it to return ONLY JSON with the fields we need.
 */
async function callOpenAiForLiveness(frameDataUrl) {
  const apiKey = process.env.OPENAI_API_KEY;

  const prompt = `
You are analyzing a photo of a fish that comes from a short fishing video.

Return ONLY JSON (no extra text) with the following keys:
- "aliveScore": number between 0 and 1 (1 = clearly alive / freshly caught with visible signs like gills moving, eyes clear, body movement, 0 = clearly dead, frozen, or fake).
- "confidence": number between 0 and 1 for how confident you are in the aliveScore.
- "species": the most likely fish species name (e.g., "Striped Bass", "Bluefish", "Flounder"). If uncertain, provide your best guess.
- "fishFingerprint": a short, specific description of the fish's appearance (colors, patterns, marks, approximate size, distinctive features).
- "explanation": 1–3 sentences explaining why you chose this aliveScore, noting specific signs of life or death.

Look for signs of life: clear eyes, gill movement, body position, skin texture, fin position, etc.
Look for signs of death: cloudy eyes, stiff body, unnatural position, freezer burn, etc.

Example of the JSON shape:
{
  "aliveScore": 0.8,
  "confidence": 0.7,
  "species": "Striped Bass",
  "fishFingerprint": "Silver body with dark lateral stripes, ~26 inches, small nick in tail fin, distinctive scale pattern on left side.",
  "explanation": "Fish shows clear eyes and natural body position consistent with a live catch."
}
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // adjust if you prefer another vision-capable model
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that evaluates fish photos for liveness and uniqueness. Be thorough and look for specific visual indicators.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: frameDataUrl, // data:image/jpeg;base64,...
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenAI error:", res.status, text);
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log("Raw OpenAI response:", JSON.stringify(data, null, 2));
  return data;
}

async function getFingerprintEmbedding(fingerprintText) {
  const apiKey = process.env.OPENAI_API_KEY;

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: fingerprintText,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenAI embeddings error:", res.status, text);
    throw new Error(`OpenAI embeddings error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding not found or invalid");
  }
  return embedding;
}


/**
 * Extract the JSON the model returned and normalize to our shape.
 */
function normalizeLivenessResult(openaiResponse) {
  let aliveScore = 0.5;
  let confidence = 0.5;
  let explanation = "No structured explanation returned.";
  let fishFingerprint = "";
  let species = "";

  try {
    const content = openaiResponse.choices?.[0]?.message?.content;
    // When we ask for pure JSON, content should be a JSON string or array with one JSON block.
    let text;
    if (Array.isArray(content)) {
      // content can be an array of segments; join text parts
      text = content
        .map((part) => (typeof part === "string" ? part : part.text || ""))
        .join(" ");
    } else {
      text = content;
    }

    const trimmed = typeof text === "string" ? text.trim() : "";
    const jsonStart = trimmed.indexOf("{");
    const jsonEnd = trimmed.lastIndexOf("}");
    const jsonText =
      jsonStart >= 0 && jsonEnd >= jsonStart
        ? trimmed.slice(jsonStart, jsonEnd + 1)
        : trimmed;

    const parsed = JSON.parse(jsonText);

    if (typeof parsed.aliveScore === "number") {
      aliveScore = clamp01(parsed.aliveScore);
    }
    if (typeof parsed.confidence === "number") {
      confidence = clamp01(parsed.confidence);
    }
    if (typeof parsed.explanation === "string") {
      explanation = parsed.explanation;
    }
    if (typeof parsed.fishFingerprint === "string") {
      fishFingerprint = parsed.fishFingerprint;
    }
    if (typeof parsed.species === "string") {
      species = parsed.species;
    }

    // Optional future: if you instruct the model to also provide a short numeric vector in JSON,
    // you can parse it here as parsed.fishEmbedding.
  } catch (err) {
    console.error("Error parsing OpenAI JSON output:", err);
  }

  return { aliveScore, confidence, explanation, fishFingerprint, species };
}

function clamp01(x) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
