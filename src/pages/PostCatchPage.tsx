// src/pages/PostCatchPage.tsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { analyzeCatchVideo } from "../api/videoApi";
import type { AliveAnalysisResult } from "../api/videoApi";

import { initCatchUpload } from "../api/catchUploadApi";
import {
  createPendingCatchFromUpload,
  updateCatchAfterAnalysis,
  checkFishUniqueness,
} from "../api/catchApi";
import { awardPointsForVerifiedCatch } from "../api/authApi";

import { AnalysisCard } from "../components/AnalysisCard";

type VerificationResult = {
  verified: boolean;
  aliveScore: number;
  confidence: number;
  isUnique: boolean;
  reason?: string;
};

export const PostCatchPage: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [hasCamera, setHasCamera] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(6);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [catchId, setCatchId] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AliveAnalysisResult | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<Array<{ time: string; level: string; message: string }>>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);

  // Capture console errors and logs for mobile debugging
  useEffect(() => {
    const originalError = console.error;
    const originalLog = console.log;
    const originalWarn = console.warn;

    const addLog = (level: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugLogs(prev => [...prev.slice(-19), { // Keep last 20 logs
        time: new Date().toLocaleTimeString(),
        level,
        message
      }]);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog('error', ...args);
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog('log', ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog('warn', ...args);
    };

    return () => {
      console.error = originalError;
      console.log = originalLog;
      console.warn = originalWarn;
    };
  }, []);

  // Load location from localStorage on mount
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const stored = localStorage.getItem("cofish_last_location");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Don't auto-start camera on mobile - requires user gesture
  // Camera will be requested when user taps "Record" button
  // Note: We check camera support dynamically in startRecording since
  // navigator.mediaDevices might not be available immediately on some browsers

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Countdown timer for recording
  useEffect(() => {
    if (!recording) {
      setRecordingCountdown(6);
      return;
    }

    const interval = setInterval(() => {
      setRecordingCountdown((prev) => {
        if (prev <= 1) {
          return 6; // Reset when done
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [recording]);

  // Don't auto-request location on mount (mobile requires user gesture)
  // User will click button to request location

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by your browser. Please use a modern browser like Chrome, Safari, or Firefox.");
    }

    // Check if we're in a restricted environment (like IDE browser)
    if (window.location.protocol === "file:" || !window.isSecureContext) {
      console.warn("Location may not work in this environment. HTTPS or localhost required.");
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          // On mobile, use less strict options for better compatibility
          // enableHighAccuracy can be slow and may timeout
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: false, // Start with false for better mobile compatibility
              timeout: 15000, // Longer timeout for mobile
              maximumAge: 60000, // Accept location up to 1 minute old
            }
          );
        }
      );

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setLocation(newLocation);
      // Persist location to localStorage
      try {
        localStorage.setItem("cofish_last_location", JSON.stringify(newLocation));
      } catch {
        // ignore if localStorage fails
      }
    } catch (e: any) {
      console.error("Location error:", e);
      let errorMessage = "Could not get your location. Please try again.";
      
      if (e.code === 1) {
        // PERMISSION_DENIED
        errorMessage = "Location permission denied. Please enable location access in your browser settings and try again.";
      } else if (e.code === 2) {
        // POSITION_UNAVAILABLE
        errorMessage = "Location unavailable. Please check your GPS/network connection and try again.";
      } else if (e.code === 3) {
        // TIMEOUT
        errorMessage = "Location request timed out. Please try again.";
      }
      
      throw new Error(errorMessage);
    }
  };

  const enableCamera = async () => {
    setError(null);
    
    // Request camera permission (user gesture required on mobile)
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      try {
        let stream: MediaStream;
        
        // Try back camera first (mobile), then fallback to any camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, // Prefer back camera on mobile
            audio: false,
          });
        } catch (backCameraError) {
          // Fallback to any available camera
          console.log("Back camera failed, trying any camera");
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        
        mediaStreamRef.current = stream;
        setHasCamera(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        console.error("Camera access error:", e);
        const errorName = e?.name || "";
        const errorMessage = e?.message || "";
        
        // Check if it's a "not supported" error
        if (errorMessage.includes("not supported") || errorMessage.includes("getUserMedia") || 
            errorName === "TypeError" || (e instanceof TypeError)) {
          // This might be a browser compatibility issue
          setError("Camera access failed. Make sure you're using Safari on iOS, and the page is loaded over HTTPS or localhost.");
        } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorMessage.includes("permission")) {
          setError("Camera permission denied. Please tap 'Allow' when prompted, or enable camera access in your browser settings.");
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setError("No camera found. Please check your device.");
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
          setError("Camera is being used by another app. Please close other apps using the camera.");
        } else {
          setError(`Could not access camera: ${errorMessage || errorName || "Unknown error"}. Please check your browser settings.`);
        }
        setHasCamera(false);
        return;
      }
    }
    
    // Camera is now enabled
    setHasCamera(true);
    setError(null);
  };

  const startRecording = async () => {
    setError(null);
    
    // Make sure camera is enabled first
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      setError("Please enable camera first using the 'Enable Camera' button.");
      return;
    }
    
    // Request location if not available (after camera is working)
    // Don't block recording if location fails - we'll request it again before posting
    if (!location) {
      // Request location in background, don't block recording
      requestLocation().catch((e) => {
        console.warn("Location request failed:", e);
        // Don't show error here - we'll check again before posting
      });
    }
    
    // Reset only analysis-related state, keep location and camera
    setAnalysis(null);
    setVerificationResult(null);
    setVideoBlob(null);
    setUploadStatus(null);
    setCatchId(null);
    setPostSuccess(false);

    recordedChunksRef.current = [];

    let mimeType = "";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }

    const recorder = new MediaRecorder(
      mediaStreamRef.current,
      mimeType ? { mimeType } : undefined
    );

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType || "video/webm",
      });
      setVideoBlob(blob);
      setRecording(false);
      // Keep camera active - don't stop the stream, just the recorder
      // This allows user to record again without re-enabling camera
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);

    // auto-stop after 6 seconds
    setTimeout(() => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    }, 6000);
  };

  const onAnalyze = async () => {
    if (!videoBlob) {
      setError("No video recorded yet.");
      return;
    }

    // Request location if still not available
    if (!location) {
      setError("Location is required to post a catch. Requesting location...");
      try {
        await requestLocation();
        if (!location) {
          setError("Location is required. Please enable location access and try again.");
          return;
        }
      } catch (e) {
        setError("Location is required. Please enable location access and try again.");
        return;
      }
    }

    setError(null);
    setAnalysis(null);
    setVerificationResult(null);
    setUploading(true);
    setUploadStatus("Requesting upload slot…");
    setCatchId(null);

    try {
      const contentType = videoBlob.type || "video/webm";
      console.log("Starting upload process, video size:", videoBlob.size, "type:", contentType);

      // 1) presigned URL
      const apiEndpoint = import.meta.env.VITE_GET_UPLOAD_URL || "https://kq9ik7tn65.execute-api.us-east-1.amazonaws.com/dev/getUploadUrl";
      console.log("Requesting upload URL from API endpoint:", apiEndpoint);
      const { uploadUrl, catchId: newCatchId, s3Key } =
        await initCatchUpload(contentType);
      console.log("✅ Upload URL received successfully");
      console.log("CatchId:", newCatchId);
      console.log("S3Key:", s3Key);
      console.log("Presigned URL length:", uploadUrl?.length || 0);
      // Log first 100 chars of URL for debugging (contains bucket/region info)
      if (uploadUrl) {
        try {
          const urlObj = new URL(uploadUrl);
          console.log("Presigned URL domain:", urlObj.hostname);
          console.log("Presigned URL path preview:", urlObj.pathname.substring(0, 80) + "...");
          console.log("Presigned URL has query params:", urlObj.search ? "Yes" : "No");
        } catch (urlParseError) {
          console.error("Failed to parse presigned URL:", urlParseError);
        }
      }

      setCatchId(newCatchId);
      setUploadStatus("Uploading video to CoFish…");

      // 2) upload to S3
      console.log("📤 Starting S3 upload...");
      console.log("Video blob size:", videoBlob.size, "bytes (", Math.round(videoBlob.size / 1024), "KB)");
      console.log("Video blob type:", videoBlob.type);
      console.log("Content-Type header:", contentType);
      
      // Validate presigned URL
      let s3Hostname = "";
      try {
        const urlObj = new URL(uploadUrl);
        s3Hostname = urlObj.hostname;
        console.log("S3 upload URL domain:", s3Hostname);
        console.log("S3 upload URL path:", urlObj.pathname.substring(0, 60) + "...");
        if (!s3Hostname.includes("s3") && !s3Hostname.includes("amazonaws")) {
          console.warn("⚠️ Presigned URL doesn't look like an S3 URL. Hostname:", s3Hostname);
        }
      } catch (urlError) {
        console.error("❌ Invalid upload URL format:", urlError);
        throw new Error(`Invalid upload URL received from server. The presigned URL appears to be malformed.`);
      }
      
      // Validate video blob
      if (!videoBlob || videoBlob.size === 0) {
        throw new Error("Video blob is empty or invalid. Please record a video first.");
      }
      
      if (videoBlob.size > 100 * 1024 * 1024) { // 100MB limit
        console.warn("⚠️ Video is very large:", Math.round(videoBlob.size / 1024 / 1024), "MB");
      }
      
      console.log("🚀 Sending PUT request to S3...");
      let putRes;
      try {
        // For presigned URLs, we must match the exact Content-Type that was signed
        // Don't include any other headers that weren't part of the signature
        const startTime = Date.now();
        putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: videoBlob,
          headers: {
            "Content-Type": contentType,
          },
          // Add signal for timeout handling
          signal: AbortSignal.timeout(60000), // 60 second timeout
        });
        const uploadTime = Date.now() - startTime;
        console.log("📡 Upload fetch completed");
        console.log("Upload duration:", uploadTime, "ms");
        console.log("Response status:", putRes.status);
        console.log("Response ok:", putRes.ok);
        console.log("Response headers:", Object.fromEntries(putRes.headers.entries()));
      } catch (fetchError: any) {
        console.error("❌ Upload fetch error:", fetchError);
        console.error("Error details:", {
          name: fetchError?.name,
          message: fetchError?.message,
          stack: fetchError?.stack,
          cause: fetchError?.cause,
        });
        
        // Check if it's a CORS error specifically
        const errorMessage = fetchError?.message || String(fetchError);
        const errorName = fetchError?.name || "";
        
        // CORS errors typically show up as "Failed to fetch" or "NetworkError" 
        // but the real issue is CORS blocking the request
        if (errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("NetworkError") || 
            errorMessage.includes("Load Failed") ||
            errorName === "TypeError") {
          // This is likely a CORS issue - the browser blocks the request before it reaches S3
          throw new Error(
            `S3 upload failed: CORS configuration issue. ` +
            `The S3 bucket may be missing CORS configuration allowing PUT requests from your origin. ` +
            `Error: ${errorMessage}. ` +
            `Please check S3 bucket CORS settings or contact support.`
          );
        } else if (errorMessage.includes("CORS") || errorMessage.includes("cors")) {
          throw new Error(`CORS error during upload: ${errorMessage}`);
        } else {
          throw new Error(`Upload failed: ${errorMessage}`);
        }
      }

      if (!putRes.ok) {
        let errorText = "";
        let errorXml = "";
        try {
          errorText = await putRes.text();
          errorXml = errorText;
          console.error("❌ Upload failed response body:", errorText);
          
          // Try to parse XML error response from S3
          if (errorText.includes("<?xml")) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(errorText, "text/xml");
            const code = xmlDoc.querySelector("Code")?.textContent;
            const message = xmlDoc.querySelector("Message")?.textContent;
            if (code || message) {
              console.error("S3 Error Code:", code);
              console.error("S3 Error Message:", message);
              errorText = `S3 Error: ${code || "Unknown"} - ${message || errorText}`;
            }
          }
        } catch (e) {
          errorText = `Could not read error response (status ${putRes.status})`;
        }
        
        // Check for CORS-related status codes
        if (putRes.status === 403) {
          throw new Error(
            `Upload forbidden (403). This may be a CORS or permissions issue. ` +
            `S3 response: ${errorText || "No error details"}`
          );
        }
        
        throw new Error(`Upload failed with status ${putRes.status}: ${errorText || "Unknown error"}`);
      }
      console.log("Video upload successful");

      setUploadStatus("Upload complete. Creating catch record…");

      // 3) create pending Catch with location
      await createPendingCatchFromUpload({
        catchId: newCatchId,
        s3Key,
        lat: location.lat,
        lng: location.lng,
      });

      setUploadStatus("Analyzing video…");
      setUploading(false);

      // 4) Analyze video (multiple frames)
      setAnalyzing(true);
      console.log("Starting video analysis, blob size:", videoBlob.size, "type:", videoBlob.type);
      let result;
      try {
        result = await analyzeCatchVideo(videoBlob);
        console.log("Video analysis complete:", result);
      } catch (analysisError: any) {
        console.error("Video analysis failed:", analysisError);
        throw new Error(`Video analysis failed: ${analysisError?.message || "Unknown error"}`);
      }
      setAnalysis(result);

      // 5) Check uniqueness
      setUploadStatus("Checking for duplicate catches…");
      const uniquenessResult = await checkFishUniqueness({
        catchId: newCatchId,
        fishEmbedding: result.fishEmbedding,
      });
      
      console.log("Uniqueness check result:", {
        isUnique: uniquenessResult.isUnique,
        similarityScore: uniquenessResult.similarityScore,
        similarCatchId: uniquenessResult.similarCatchId,
        fishFingerprint: result.fishFingerprint,
      });

      // 6) Verify catch
      // TODO: Change back to 0.7 for production - currently 0.01 for testing
      const isAlive = result.aliveScore >= 0.01 && result.confidence >= 0.6;
      const isUnique = uniquenessResult.isUnique;

      const verified = isAlive && isUnique;

      setVerificationResult({
        verified,
        aliveScore: result.aliveScore,
        confidence: result.confidence,
        isUnique,
        reason: verified
          ? undefined
          : !isUnique
          ? "This catch appears to be a duplicate"
          : !isAlive
          ? "Fish does not appear to be alive"
          : "Verification failed",
      });

      // 7) Update catch record with analysis
      const updatedCatch = await updateCatchAfterAnalysis({
        id: newCatchId,
        aliveScore: result.aliveScore,
        analysisConfidence: result.confidence,
        analysisNote:
          result.explanation ||
          "Analysis completed with multiple frame verification.",
        verificationStatus: verified ? "VERIFIED" : "REJECTED",
        fishFingerprint: (result as any).fishFingerprint,
        fishEmbedding: (result as any).fishEmbedding,
      });

      // Verify the update worked
      if (verified && updatedCatch.verificationStatus !== "VERIFIED") {
        console.warn("Catch update may have failed. Expected VERIFIED, got:", updatedCatch.verificationStatus);
        // Try to update again
        await updateCatchAfterAnalysis({
          id: newCatchId,
          aliveScore: result.aliveScore,
          analysisConfidence: result.confidence,
          verificationStatus: "VERIFIED",
        });
      }

      setUploadStatus(null);
    } catch (e: any) {
      console.error("onAnalyze error", e);
      setError(e?.message || "Upload/analysis failed.");
      setUploading(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePostCatch = async () => {
    if (!catchId || !verificationResult?.verified) {
      setError("Catch is not verified. Please verify your catch first.");
      return;
    }

    setPosting(true);
    setError(null);

    try {
      // Double-check catch is verified before posting
      const { getCatchById } = await import("../api/catchApi");
      const currentCatch = await getCatchById(catchId);
      
      if (!currentCatch) {
        throw new Error("Catch not found.");
      }
      
      if (currentCatch.verificationStatus !== "VERIFIED") {
        // Try to update it one more time
        const { updateCatchAfterAnalysis } = await import("../api/catchApi");
        await updateCatchAfterAnalysis({
          id: catchId,
          aliveScore: verificationResult.aliveScore,
          analysisConfidence: verificationResult.confidence,
          verificationStatus: "VERIFIED",
        });
        
        // Wait a moment for the update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      await awardPointsForVerifiedCatch(catchId);
      setPostSuccess(true);
      // Show success message, then navigate after 2 seconds
      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (e: any) {
      console.error("Post catch error", e);
      setError(e?.message || "Failed to post catch.");
      setPosting(false);
    }
  };

  const isAnalyzeDisabled =
    !videoBlob || uploading || analyzing || !location;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-4">
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Home
        </button>
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Post a Catch
          </div>
          <div className="text-sm text-slate-200">
            Record & verify your catch
          </div>
        </div>
        <div className="w-12" />
      </header>

      {/* Success Message */}
      {postSuccess && (
        <div className="mb-3 border border-emerald-700 bg-emerald-950/40 rounded-lg px-4 py-3">
          <div className="text-sm font-semibold text-emerald-400 mb-1">
            ✓ Catch Posted Successfully!
          </div>
          <div className="text-xs text-slate-300">
            +100 points have been added to your account. Redirecting to home page...
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="rounded-xl overflow-hidden border border-sky-700 bg-slate-900 h-64 flex items-center justify-center relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {!hasCamera && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
              <div className="text-center text-slate-400 text-sm px-4">
                Camera will be requested when you tap "Record"
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {!hasCamera && (
          <button
            onClick={enableCamera}
            className="w-full rounded-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500"
          >
            Enable Camera
          </button>
        )}
        <button
          disabled={recording || !hasCamera}
          onClick={startRecording}
          className={`w-full rounded-full py-2 text-sm font-semibold ${
            recording || !hasCamera
              ? "bg-slate-700 text-slate-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {recording 
            ? `Recording… ${recordingCountdown}s` 
            : "Record 6-second clip"}
        </button>
        {!hasCamera && !recording && (
          <div className="text-[10px] text-slate-500 text-center">
            Enable camera first to frame your fish, then record.
          </div>
        )}

        {videoBlob && !recording && (
          <div className="text-xs text-slate-400">
            ✅ Clip recorded ({Math.round(videoBlob.size / 1024)} KB). Ready
            to analyze.
          </div>
        )}
      </div>

      <div className="mb-4 space-y-2">
        <button
          disabled={isAnalyzeDisabled}
          onClick={onAnalyze}
          className={`w-full rounded-full py-2 text-sm font-semibold ${
            isAnalyzeDisabled
              ? "bg-slate-700 text-slate-500"
              : "bg-purple-600 hover:bg-purple-500"
          }`}
        >
          {uploading
            ? uploadStatus || "Uploading…"
            : analyzing
            ? uploadStatus || "Analyzing…"
            : "Upload Catch"}
        </button>

        {uploadStatus && !uploading && !analyzing && (
          <div className="text-[11px] text-slate-500">{uploadStatus}</div>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-rose-400 border border-rose-700/60 bg-rose-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Debug Console for Mobile */}
      <div className="mb-3">
        <button
          onClick={() => setShowDebugConsole(!showDebugConsole)}
          className="w-full text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-2 py-1 bg-slate-900/50"
        >
          {showDebugConsole ? '▼' : '▶'} Debug Console {debugLogs.length > 0 && `(${debugLogs.length})`}
        </button>
        {showDebugConsole && (
          <div className="mt-2 border border-slate-700 bg-slate-900/90 rounded-lg p-2 max-h-64 overflow-y-auto">
            {debugLogs.length === 0 ? (
              <div className="text-xs text-slate-500">No logs yet...</div>
            ) : (
              <div className="space-y-1 text-[10px] font-mono">
                {debugLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-1 rounded ${
                      log.level === 'error'
                        ? 'bg-rose-950/40 text-rose-300'
                        : log.level === 'warn'
                        ? 'bg-yellow-950/40 text-yellow-300'
                        : 'bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 flex-shrink-0">{log.time}</span>
                      <span className="text-slate-400 flex-shrink-0">[{log.level}]</span>
                      <span className="break-all">{log.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setDebugLogs([])}
              className="mt-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear logs
            </button>
          </div>
        )}
      </div>

      <AnalysisCard analysis={analysis} />

      {/* Uniqueness Debug Info (Development) */}
      {verificationResult && import.meta.env.DEV && (
        <div className="mt-3 border border-slate-700 bg-slate-900/80 rounded-lg px-3 py-2 text-xs">
          <div className="font-semibold text-slate-300 mb-1">Uniqueness Check:</div>
          <div className="text-slate-400">
            Status: {verificationResult.isUnique ? (
              <span className="text-emerald-400">✓ Unique</span>
            ) : (
              <span className="text-rose-400">✗ Duplicate detected</span>
            )}
          </div>
          {analysis?.fishFingerprint && (
            <div className="text-slate-500 mt-1 text-[10px]">
              Fingerprint: {analysis.fishFingerprint}
            </div>
          )}
          <div className="text-slate-500 mt-1 text-[10px]">
            Check browser console for detailed similarity scores
          </div>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div
          className={`mt-4 border rounded-xl p-4 ${
            verificationResult.verified
              ? "border-emerald-700 bg-emerald-950/40"
              : "border-rose-700 bg-rose-950/40"
          }`}
        >
          {verificationResult.verified ? (
            <>
              <div className="text-lg font-semibold text-emerald-400 mb-2">
                ✓ Catch Verified
              </div>
              <div className="text-sm text-slate-300 mb-4">
                Your catch has been verified as alive and unique! You'll receive
                100 points when you post it.
              </div>
              <button
                onClick={handlePostCatch}
                disabled={posting || postSuccess}
                className="w-full rounded-full bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {posting
                  ? "Posting..."
                  : postSuccess
                  ? "Posted! Redirecting..."
                  : "Post Catch & Earn Points"}
              </button>
              {postSuccess && (
                <div className="mt-3 text-sm text-emerald-300 font-semibold text-center">
                  ✓ Success! +100 points awarded. Returning to home...
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-rose-400 mb-2">
                ✗ Could Not Verify Catch
              </div>
              <div className="text-sm text-slate-300 mb-2">
                Could not verify fish is alive and unique. Please retry video or
                post another catch.
              </div>
              {verificationResult.reason && (
                <div className="text-xs text-slate-400 mt-2">
                  Reason: {verificationResult.reason}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-3">
                Alive Score: {verificationResult.aliveScore.toFixed(2)} (need
                ≥0.01) | Confidence: {verificationResult.confidence.toFixed(2)}{" "}
                (need ≥0.6) | Unique: {verificationResult.isUnique ? "Yes" : "No"}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

