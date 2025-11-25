// src/pages/PointsHistoryPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserLedger } from "../api/authApi";
import type { LedgerEntry, UserProfile } from "../api/authApi";

export const PointsHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { profile, entries } = await getUserLedger();
        setProfile(profile);
        setEntries(entries);
      } catch (e) {
        console.error("Failed to load ledger:", e);
        navigate("/signin", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        Loading...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Home
        </button>
        <div className="text-center flex-1">
          <div className="text-xs text-slate-400 uppercase tracking-wide">
            Points History
          </div>
          <div className="text-sm text-slate-300">
            {profile.displayName || profile.email}
          </div>
        </div>
        <div className="w-12" />
      </header>

      {/* Balance */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-slate-400">Current Balance</div>
          <div className="text-2xl font-semibold text-emerald-400">
            {profile.pointsBalance}
          </div>
        </div>
      </div>

      {/* Entries */}
      <div className="space-y-3 pb-6">
        {entries.length === 0 && (
          <div className="text-xs text-slate-500">
            No activity yet. Post a catch or buy a TargetZone to get started.
          </div>
        )}

        {entries.map((entry) => {
          const date = new Date(entry.createdAt);
          const isCatch = entry.type === "CATCH";
          const isCredit = entry.totalPoints > 0;
          const absChange = Math.abs(entry.totalPoints);

          const typeLabel = isCatch ? "Catch" : "TargetZone Purchase";
          const icon = isCatch ? "🐟" : "🎯";

          const basePoints = entry.basePoints ?? 0;
          const karmaPoints = entry.karmaPoints ?? 0;
          const total = absChange;

          return (
            <div
  key={`${entry.type}-${entry.id}`}
  className="rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 shadow-sm shadow-slate-900/60 flex items-center gap-3"
>
  {/* Thumbnail */}
  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
    <span className="text-lg">{icon}</span>
  </div>

  {/* Main */}
  <div className="flex-1">
    <div className="flex justify-between items-start">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {typeLabel}
        </div>
        <div className="text-sm font-semibold text-slate-100">
          {entry.description}
        </div>
      </div>
    </div>

    <div className="flex justify-between items-center mt-1">
      <div className="text-[11px] text-slate-500">
        {date.toLocaleDateString()}{" "}
        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  </div>

  {/* Points block (right side) */}
  <div className="items-end text-right min-w-[110px]">
    {isCatch ? (
      <>
        {/* base—no plus */}
        <div className="text-[11px] text-slate-100">
          {basePoints} base
        </div>

        {/* karma—keep + */}
        <div className="text-[11px] text-slate-100">
          +{karmaPoints} karma
        </div>

        {/* total — = +100 Pts */}
        <div className="text-sm font-bold text-emerald-400 mt-1">
          +{total} Pts
        </div>
      </>
    ) : (
      <>
        {/* purchase rows — remove “spent” line, only show total */}
        <div className="text-sm font-bold mt-1 text-blue-400">
          -{absChange} Pts
        </div>
      </>
    )}

    {/* Balance */}
    <div className="text-[11px] text-emerald-300 mt-1">
      New Balance: {entry.newBalance}
    </div>
  </div>
</div>

          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Credits from catches (including karma) and debits from TargetZone
        purchases are shown here. In production, karma is awarded when other
        anglers succeed using your shared information.
      </p>
    </div>
  );
};
