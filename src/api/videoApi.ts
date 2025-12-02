// src/api/videoApi.ts

export type AliveAnalysisResult = {
  aliveScore: number;
  confidence: number;
  explanation?: string;

  // Optional extras from Lambda
  fishFingerprint?: string;
  fishEmbedding?: number[];
  species?: string;
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
    const objectUrl = URL.createObjectURL(videoBlob);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const frames: string[] = [];
    let framesCaptured = 0;
    let timeoutId: number | null = null;
    const TIMEOUT_MS = 30000; // 30 second timeout for frame capture

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      URL.revokeObjectURL(objectUrl);
    };

    const rejectWithCleanup = (error: Error) => {
      cleanup();
      reject(error);
    };

    // Set overall timeout
    timeoutId = window.setTimeout(() => {
      rejectWithCleanup(new Error("Frame capture timed out. Video may be too large or in an unsupported format."));
    }, TIMEOUT_MS);

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration && !Number.isNaN(video.duration)
          ? video.duration
          : 0;

        if (duration === 0 || !video.videoWidth || !video.videoHeight) {
          // Fallback: try to capture at time 0 after a short delay
          setTimeout(() => {
            try {
              const canvas = document.createElement("canvas");
              const w = video.videoWidth || 640;
              const h = video.videoHeight || 360;
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                rejectWithCleanup(new Error("No 2D canvas context"));
                return;
              }
              video.currentTime = 0;
              // Wait a bit for seek to complete
              setTimeout(() => {
                try {
                  ctx.drawImage(video, 0, 0, w, h);
                  const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                  cleanup();
                  resolve([dataUrl]); // Return single frame as fallback
                } catch (err) {
                  rejectWithCleanup(new Error(`Failed to capture frame: ${err}`));
                }
              }, 500);
            } catch (err) {
              rejectWithCleanup(new Error(`Failed to setup fallback capture: ${err}`));
            }
          }, 500);
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

        let seekTimeout: number | null = null;
        const SEEK_TIMEOUT_MS = 5000; // 5 seconds per frame seek

        const captureFrame = (time: number, frameIndex: number) => {
          // Clear any previous seek timeout
          if (seekTimeout !== null) {
            clearTimeout(seekTimeout);
          }

          // Set timeout for this seek operation
          seekTimeout = window.setTimeout(() => {
            rejectWithCleanup(new Error(`Frame capture timed out at frame ${frameIndex + 1}`));
          }, SEEK_TIMEOUT_MS);

          video.currentTime = time;
        };

        video.onseeked = () => {
          // Clear seek timeout
          if (seekTimeout !== null) {
            clearTimeout(seekTimeout);
            seekTimeout = null;
          }

          try {
            const canvas = document.createElement("canvas");
            const w = video.videoWidth || 640;
            const h = video.videoHeight || 360;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              rejectWithCleanup(new Error("No 2D canvas context"));
              return;
            }
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            frames.push(dataUrl);
            framesCaptured++;

            if (framesCaptured < times.length) {
              captureFrame(times[framesCaptured], framesCaptured);
            } else {
              URL.revokeObjectURL(video.src);
              cleanup();
              console.log(`Successfully captured ${frames.length} frames from video`);
              if (frames.length < frameCount) {
                console.warn(`Expected ${frameCount} frames but only captured ${frames.length}`);
              }
              resolve(frames);
            }
          } catch (err) {
            rejectWithCleanup(new Error(`Failed to capture frame ${framesCaptured + 1}: ${err}`));
          }
        };

        // Start capturing first frame
        captureFrame(times[0], 0);
      } catch (err) {
        rejectWithCleanup(new Error(`Frame capture setup failed: ${err}`));
      }
    };

    video.onerror = () => {
      rejectWithCleanup(new Error("Failed to load video for frame capture"));
    };

    // Load the video
    video.load();
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

  console.log(`Analyzed ${frames.length} frames`);

  return {
    aliveScore: data.aliveScore ?? 0,
    confidence: data.confidence ?? 0,
    explanation: data.explanation ?? "",
    fishFingerprint: data.fishFingerprint,
    fishEmbedding: data.fishEmbedding,
    species: data.species,
  };
}
