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
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back
        </button>
        <div className="text-center flex-1">
          <div className="text-xs text-slate-400">Points History</div>
          <div className="text-sm text-slate-300">
            {profile.displayName || profile.email}
          </div>
        </div>
        <div className="w-12" />
      </header>

      <div className="mb-4">
        <div className="text-xs text-slate-400">Current Balance</div>
        <div className="text-2xl font-semibold text-emerald-400">
          {profile.pointsBalance}
        </div>
      </div>

      <div className="space-y-3 pb-6">
        {entries.length === 0 && (
          <div className="text-xs text-slate-500">
            No history yet. Post a catch or buy a TargetZone to get started.
          </div>
        )}

        {entries.map((entry) => {
          const date = new Date(entry.createdAt);
          const isCredit = entry.totalPoints > 0;
          const sign = isCredit ? "+" : "";
          const pointsText = `${sign}${entry.totalPoints}`;

          return (
            <div
              key={`${entry.type}-${entry.id}`}
              className="rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3"
            >
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-semibold text-slate-100">
                  {entry.description}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isCredit ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {pointsText}
                </div>
              </div>

              <div className="flex justify-between items-center mt-1">
                <div className="text-xs text-slate-500">
                  {date.toLocaleDateString()}{" "}
                  {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-xs text-emerald-300">
                  New Balance: {entry.newBalance}
                </div>
              </div>

              {entry.type === "CATCH" && (
                <div className="mt-1 text-xs text-slate-400 flex justify-between">
                  <span>
                    Base:{" "}
                    <span className="text-emerald-400 font-semibold">
                      +{entry.basePoints ?? 0}
                    </span>
                  </span>
                  <span>
                    Karma:{" "}
                    <span className="text-sky-300">
                      +{entry.karmaPoints ?? 0}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
