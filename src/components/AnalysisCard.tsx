// src/components/AnalysisCard.tsx

import React from "react";
import type { AliveAnalysisResult } from "../api/videoApi";

type Props = {
  analysis: AliveAnalysisResult | null;
};

export const AnalysisCard: React.FC<Props> = ({ analysis }) => {
  if (!analysis) return null;

  const hasEmbedding =
    Array.isArray(analysis.fishEmbedding) &&
    analysis.fishEmbedding.length > 0;

  return (
    <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-3 text-sm space-y-1 mt-4">
      <div className="font-semibold text-slate-200">AI Analysis</div>

      {analysis.species && (
        <div>
          Likely Species:{" "}
          <span className="font-semibold text-purple-400">
            {analysis.species}
          </span>
        </div>
      )}

      <div>
        Alive score:{" "}
        <span className="font-semibold text-emerald-400">
          {analysis.aliveScore.toFixed(2)}
        </span>
      </div>
      <div>
        Confidence (liveness):{" "}
        <span className="font-semibold text-sky-400">
          {analysis.confidence.toFixed(2)}
        </span>
      </div>

      {analysis.explanation && (
        <div className="text-xs text-slate-300 mt-1">
          {analysis.explanation}
        </div>
      )}

      {analysis.fishFingerprint && (
        <div className="text-xs text-slate-300 mt-2">
          <span className="font-semibold text-slate-200">
            Fish fingerprint:
          </span>{" "}
          {analysis.fishFingerprint}
        </div>
      )}

      {hasEmbedding && (
        <div className="text-[10px] text-slate-500 mt-2">
          <div className="font-semibold text-slate-300">
            fishEmbedding (first 8 dims):
          </div>
          <div className="font-mono break-all">
            {analysis.fishEmbedding!.slice(0, 8).map((v, i) => (
              <span key={i}>
                {v.toFixed(3)}
                {i < 7 ? ", " : ""}
              </span>
            ))}
            {analysis.fishEmbedding!.length > 8 && " …"}
          </div>
        </div>
      )}

      <div className="text-[10px] text-slate-500 mt-2">
        Note: confidence is how sure the model is about the{" "}
        <span className="font-semibold">liveness</span> score.
        Uniqueness / duplicate detection will come from comparing{" "}
        <span className="font-semibold">fishEmbedding</span> vectors between catches.
      </div>
    </div>
  );
};
