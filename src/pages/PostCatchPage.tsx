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
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [catchId, setCatchId] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AliveAnalysisResult | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

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

  // Don't auto-request location on mount (mobile requires user gesture)
  // User will click button to request location

  const requestLocation = async () => {
    setRequestingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by your browser. Please use a modern browser like Chrome, Safari, or Firefox."
      );
      setRequestingLocation(false);
      return;
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
      setLocationError(null); // Clear any previous errors
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
      
      setLocationError(errorMessage);
      // In development, offer manual entry as fallback
      if (import.meta.env.DEV) {
        setShowManualLocation(true);
      }
    } finally {
      setRequestingLocation(false);
    }
  };

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      setLocationError("Please enter valid latitude and longitude numbers.");
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError("Latitude must be between -90 and 90. Longitude must be between -180 and 180.");
      return;
    }
    
    const newLocation = { lat, lng };
    setLocation(newLocation);
    setLocationError(null);
    setShowManualLocation(false);
    // Persist location to localStorage
    try {
      localStorage.setItem("cofish_last_location", JSON.stringify(newLocation));
    } catch {
      // ignore if localStorage fails
    }
  };


  const startRecording = async () => {
    setError(null);
    
    // Request camera permission first (user gesture required on mobile)
    // Just try to use getUserMedia directly - no pre-checks (like the working example)
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
    
    // Request location if not available (after camera is working)
    // Don't block recording if location fails - we'll request it again before posting
    if (!location) {
      // Request location in background, don't block recording
      requestLocation().catch((e) => {
        console.warn("Location request failed:", e);
        // Don't show error here - we'll check again before posting
      });
    }
    
    // If we got here, camera is working - clear any previous errors
    setError(null);
    
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

      // 1) presigned URL
      const { uploadUrl, catchId: newCatchId, s3Key } =
        await initCatchUpload(contentType);

      setCatchId(newCatchId);
      setUploadStatus("Uploading video to CoFish…");

      // 2) upload to S3
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: videoBlob,
        headers: {
          "Content-Type": contentType,
        },
      });

      if (!putRes.ok) {
        const text = await putRes.text();
        throw new Error(`Upload failed: ${putRes.status} ${text}`);
      }

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
          : !isAlive
          ? "Fish does not appear to be alive"
          : !isUnique
          ? "This catch appears to be a duplicate"
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

      {/* Location Status - Only show errors or when location is captured */}
      {requestingLocation && (
        <div className="mb-3 text-xs text-slate-400 border border-slate-700 bg-slate-900/80 rounded-lg px-3 py-2">
          Requesting location... Please allow location access when prompted.
        </div>
      )}
      {location && !postSuccess && (
        <div className="mb-3 text-xs text-emerald-400 border border-emerald-700/60 bg-emerald-950/40 rounded-lg px-3 py-2">
          ✓ Location captured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
        </div>
      )}
      {locationError && (
        <div className="mb-3 text-xs text-rose-400 border border-rose-700/60 bg-rose-950/40 rounded-lg px-3 py-2 space-y-2">
          <div>{locationError}</div>
          <button
            onClick={requestLocation}
            className="w-full rounded-full bg-rose-600 hover:bg-rose-500 py-2 text-sm font-semibold mt-2"
          >
            Try Again
          </button>
          {showManualLocation && (
            <div className="mt-3 pt-3 border-t border-rose-700/60">
              <div className="text-xs text-slate-300 mb-2">
                Development Mode: Enter location manually for testing
              </div>
              <div className="space-y-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude (e.g., 41.1234)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude (e.g., -71.5678)"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                />
                <button
                  onClick={handleManualLocationSubmit}
                  className="w-full rounded-full bg-slate-600 hover:bg-slate-500 py-2 text-sm font-semibold"
                >
                  Use Manual Location
                </button>
              </div>
            </div>
          )}
          <div className="text-[10px] text-slate-500 mt-2">
            <div className="font-semibold mb-1">Troubleshooting:</div>
            <div>• Test in a real browser (Chrome, Safari, Firefox) - IDE browsers may not support location</div>
            <div>• Must be HTTPS or localhost (not file://)</div>
            <div>• iOS Safari: Settings → Safari → Location Services → Allow</div>
            <div>• Android Chrome: Tap lock icon → Permissions → Location → Allow</div>
            <div>• Make sure GPS/Location is enabled in device settings</div>
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
        <button
          disabled={recording}
          onClick={startRecording}
          className={`w-full rounded-full py-2 text-sm font-semibold ${
            recording
              ? "bg-slate-700 text-slate-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {recording 
            ? "Recording 6 seconds…" 
            : "Record 6-second clip"}
        </button>
        {!hasCamera && !recording && (
          <div className="text-[10px] text-slate-500 text-center">
            Tap to start recording. Camera and location permissions will be requested.
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
            : "Verify New & Unique Catch"}
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

