// src/pages/VideoTestPage.tsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { analyzeCatchVideo } from "../api/videoApi";
import type { AliveAnalysisResult } from "../api/videoApi";

import { initCatchUpload } from "../api/catchUploadApi";
import {
  createPendingCatchFromUpload,
  updateCatchAfterAnalysis,
} from "../api/catchApi";

import { useCatchStatus } from "../hooks/useCatchStatus";
import { AnalysisCard } from "../components/AnalysisCard";


export const VideoTestPage: React.FC = () => {
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
  const [error, setError] = useState<string | null>(null);

  const { catchRecord, loading: catchLoading } = useCatchStatus(catchId);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCamera(true);
    } catch (e: any) {
      console.error("startCamera error", e);
      setError(
        "Could not access camera. Please allow camera permission in your browser."
      );
    }
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) {
      setError("Camera is not active.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setVideoBlob(null);
    setUploadStatus(null);
    setCatchId(null);

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

    setError(null);
    setAnalysis(null);
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

      // 3) create pending Catch
      await createPendingCatchFromUpload({
        catchId: newCatchId,
        s3Key,
      });

      setUploadStatus("Catch created. Running stub analysis…");
      setUploading(false);

      // 4) call stubbed analysis Lambda
      setAnalyzing(true);
      const result = await analyzeCatchVideo(videoBlob);
      setAnalysis(result);

      // 5) persist analysis to Catch so polling shows it
      try {
        console.log("analyzeCatchVideo result:", result);

await updateCatchAfterAnalysis({
  id: newCatchId,
  aliveScore: result.aliveScore,
  analysisConfidence: result.confidence,
  analysisNote:
    result.explanation ||
    "Stubbed analysis from cofishapplambda.",
  verificationStatus: "ANALYZED_STUB",
  fishFingerprint: (result as any).fishFingerprint,
  fishEmbedding: (result as any).fishEmbedding,
});

      } catch (err) {
        console.error("updateCatchAfterAnalysis error", err);
      }
    } catch (e: any) {
      console.error("onAnalyze error", e);
      setError(e?.message || "Upload/analysis failed.");
      setUploading(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const isAnalyzeDisabled = !videoBlob || uploading || analyzing;

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
            Video MVP
          </div>
          <div className="text-sm text-slate-200">
            Alive / Dead detection – Milestone 1
          </div>
        </div>
        <div className="w-12" />
      </header>

      <div className="mb-4">
        <div className="rounded-xl overflow-hidden border border-sky-700 bg-slate-900 h-64 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        </div>
        {!hasCamera && (
          <button
            onClick={startCamera}
            className="mt-3 w-full rounded-full bg-blue-600 hover:bg-blue-500 py-2 text-sm font-semibold"
          >
            Enable Camera
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <button
          disabled={!hasCamera || recording}
          onClick={startRecording}
          className={`w-full rounded-full py-2 text-sm font-semibold ${
            !hasCamera || recording
              ? "bg-slate-700 text-slate-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {recording ? "Recording 6 seconds…" : "Record 6-second clip"}
        </button>

        {videoBlob && !recording && (
          <div className="text-xs text-slate-400">
            ✅ Clip recorded ({Math.round(videoBlob.size / 1024)} KB). You can
            now upload & analyze it.
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
            ? "Analyzing…"
            : "Upload & Analyze"}
        </button>

        {uploadStatus && !uploading && (
          <div className="text-[11px] text-slate-500">{uploadStatus}</div>
        )}

        {catchId && (
          <div className="text-[11px] text-slate-500">
            Catch ID: <span className="font-mono">{catchId}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 text-sm text-rose-400 border border-rose-700/60 bg-rose-950/40 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <AnalysisCard analysis={analysis} />


      {/* ---- UPDATED CATCH STATUS PANEL ---- */}
      {catchId && (
        <div className="mt-4 border border-slate-700 bg-slate-900/80 rounded-xl p-3 text-xs space-y-1">
          <div className="font-semibold text-slate-200">Catch status</div>

          <div className="font-mono text-[11px] text-slate-400 break-all">
            id: {catchId}
          </div>

          {catchLoading && (
            <div className="text-slate-400">Loading catch from server…</div>
          )}

          {catchRecord && (
            <>
              <div>
                verificationStatus:{" "}
                <span className="font-semibold text-sky-400">
                  {catchRecord.verificationStatus}
                </span>
              </div>

              <div className="text-slate-400">
                videoKey:{" "}
                <span className="font-mono text-[11px]">
                  {catchRecord.videoKey}
                </span>
              </div>

              {typeof catchRecord.aliveScore === "number" && (
                <div>
                  aliveScore:{" "}
                  <span className="font-mono text-[11px]">
                    {catchRecord.aliveScore.toFixed(2)}
                  </span>
                </div>
              )}

              {typeof catchRecord.analysisConfidence === "number" && (
                <div>
                  analysisConfidence:{" "}
                  <span className="font-mono text-[11px]">
                    {catchRecord.analysisConfidence.toFixed(2)}
                  </span>
                </div>
              )}

              {catchRecord.analysisNote && (
                <div className="text-slate-300 mt-1">
                  note: {catchRecord.analysisNote}
                </div>
              )}
              {catchRecord.fishFingerprint && (
  <div className="text-slate-300 mt-1">
    fingerprint: {catchRecord.fishFingerprint}
  </div>
)}

            </>
          )}
        </div>
      )}
    </div>
  );
};
