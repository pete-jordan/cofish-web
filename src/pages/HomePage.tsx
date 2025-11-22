// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUserProfileWithBalance,
  signOut,
  simulateCatchAndAwardPoints,
  purchaseTargetZone,
} from "../api/authApi";
import type { UserProfile } from "../api/authApi";


export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<null | "EARN" | "SPEND">(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await getCurrentUserProfileWithBalance();
        if (!p) {
          navigate("/signin", { replace: true });
          return;
        }
        setProfile(p);
      } catch (e) {
        console.error("Failed to load profile:", e);
        navigate("/signin", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.warn("Sign-out error:", e);
    } finally {
      navigate("/signin", { replace: true });
    }
  };

  const handleEarnPoints = async () => {
    if (!profile) return;
    setBusyAction("EARN");
    setMessage(null);
    try {
      const result = await simulateCatchAndAwardPoints();
      setProfile((prev) =>
        prev ? { ...prev, pointsBalance: result.pointsBalance } : prev
      );
      setMessage("Catch recorded! +100 points added.");
    } catch (e: any) {
      console.error("Earn points failed:", e);
      setMessage(e?.message || "Failed to post catch.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSpendPointsStandard = async () => {
    if (!profile) return;
    setBusyAction("SPEND");
    setMessage(null);

    try {
      // MVP: center at (0,0). Later this will come from the map.
      const res = await purchaseTargetZone({
        radiusMiles: 2,
        baseCostPoints: 100,
        centerLat: 0,
        centerLng: 0,
      });

      setProfile((prev) =>
        prev ? { ...prev, pointsBalance: res.newBalance } : prev
      );
      setMessage("Standard TargetZone purchased for 100 points.");
    } catch (e: any) {
      console.error("Purchase standard TargetZone failed:", e);
      setMessage(e?.message || "Failed to purchase TargetZone.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleSpendPointsPrecision = async () => {
    if (!profile) return;
    setBusyAction("SPEND");
    setMessage(null);

    try {
      const res = await purchaseTargetZone({
        radiusMiles: 1,
        baseCostPoints: 300,
        centerLat: 0,
        centerLng: 0,
      });

      setProfile((prev) =>
        prev ? { ...prev, pointsBalance: res.newBalance } : prev
      );
      setMessage("Precision TargetZone purchased for 300 points.");
    } catch (e: any) {
      console.error("Purchase precision TargetZone failed:", e);
      setMessage(e?.message || "Failed to purchase TargetZone.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleViewHistory = () => {
    navigate("/history");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        Loading...
      </div>
    );
  }

  if (!profile) return null;

  const isEarning = busyAction === "EARN";
  const isSpending = busyAction === "SPEND";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-4">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-slate-400">CoFish Points</div>
          <div className="text-3xl font-semibold text-emerald-400">
            {profile.pointsBalance}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          Log out
        </button>
      </header>

      <main>
        <h1 className="text-xl font-semibold mb-4">
          Welcome, {profile.displayName || profile.email}
        </h1>

        <div className="space-y-3">
          {/* Earn Points */}
          <button
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left disabled:opacity-60"
            onClick={handleEarnPoints}
            disabled={isEarning || isSpending}
          >
            <div className="text-sm font-semibold text-emerald-400">
              Earn Points — Post a Catch
            </div>
            <div className="text-xs text-slate-400">
              Simulate posting a verified catch and earn 100 points.
            </div>
          </button>

          {/* Spend Points - Standard */}
          <button
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left disabled:opacity-60"
            onClick={handleSpendPointsStandard}
            disabled={isSpending || isEarning}
          >
            <div className="text-sm font-semibold text-sky-400">
              Spend Points — Standard TargetZone
            </div>
            <div className="text-xs text-slate-400">
              2 mi radius, 100 points. Later you&apos;ll pan/zoom a map here.
            </div>
          </button>

          {/* Spend Points - Precision */}
          <button
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left disabled:opacity-60"
            onClick={handleSpendPointsPrecision}
            disabled={isSpending || isEarning}
          >
            <div className="text-sm font-semibold text-blue-300">
              Spend Points — Precision TargetZone
            </div>
            <div className="text-xs text-slate-400">
              1 mi radius, 300 points. Higher precision, higher cost.
            </div>
          </button>

          {/* View History */}
          <button
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left"
            onClick={handleViewHistory}
          >
            <div className="text-sm font-semibold text-slate-200">
              View Points History
            </div>
            <div className="text-xs text-slate-400">
              See credits, debits, and karma events.
            </div>
          </button>

          {message && (
            <div className="text-xs text-emerald-300 mt-2">
              {message}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
