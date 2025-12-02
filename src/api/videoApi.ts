// src/api/videoApi.ts

export type AliveAnalysisResult = {
  aliveScore: number;
  confidence: number;
  explanation?: string;

  // Optional extras from Lambda
  fishFingerprint?: string;
  fishEmbedding?: number[];
};

const VIDEO_ANALYZE_URL =
  import.meta.env.VITE_VIDEO_ANALYZE_URL ||
  "https://kq9ik7tn65.execute-api.us-east-1.amazonaws.com/dev/analyzeVideo";

// Capture multiple frames from the video
async function captureFrames(
  videoBlob: Blob,
  frameCount: number = 3
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;

    const frames: string[] = [];
    let framesCaptured = 0;

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration && !Number.isNaN(video.duration)
          ? video.duration
          : 0;

        if (duration === 0) {
          // Fallback: capture at time 0
          video.currentTime = 0;
          return;
        }

        // Capture frames at start, middle, and end
        const times: number[] = [];
        for (let i = 0; i < frameCount; i++) {
          if (frameCount === 1) {
            times.push(duration / 2);
          } else {
            times.push((duration / (frameCount + 1)) * (i + 1));
          }
        }

        const captureFrame = (time: number) => {
          video.currentTime = time;
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
              reject(new Error("No 2D canvas context"));
              return;
            }
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            frames.push(dataUrl);
            framesCaptured++;

            if (framesCaptured < times.length) {
              captureFrame(times[framesCaptured]);
            } else {
              URL.revokeObjectURL(video.src);
              resolve(frames);
            }
          } catch (err) {
            reject(err);
          }
        };

        captureFrame(times[0]);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error("Failed to load video for frame capture"));
    };
  });
}

export async function analyzeCatchVideo(
  videoBlob: Blob
): Promise<AliveAnalysisResult> {
  // 1) Capture multiple frames (start, middle, end)
  const frames = await captureFrames(videoBlob, 3);

  // 2) Send frames to Lambda
  const res = await fetch(VIDEO_ANALYZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ frames }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Video analyze failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  return {
    aliveScore: data.aliveScore ?? 0,
    confidence: data.confidence ?? 0,
    explanation: data.explanation ?? "",
    fishFingerprint: data.fishFingerprint,
    fishEmbedding: data.fishEmbedding,
  };
}
