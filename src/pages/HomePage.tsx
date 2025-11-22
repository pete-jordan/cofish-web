// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUserProfileWithBalance,
  signOut,
} from "../api/authApi";

type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  pointsBalance: number;
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await getCurrentUserProfileWithBalance();
        if (!p) {
          navigate("/signin", { replace: true });
          return;
        }
        setProfile(p as any);
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
          <button className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left">
            <div className="text-sm font-semibold text-emerald-400">
              Earn Points — Post a Catch
            </div>
            <div className="text-xs text-slate-400">
              Simulate a catch and earn 100 points (MVP).
            </div>
          </button>

          <button className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left">
            <div className="text-sm font-semibold text-sky-400">
              Spend Points — Buy a TargetZone
            </div>
            <div className="text-xs text-slate-400">
              Open the map and buy circles with recent catches (coming next).
            </div>
          </button>

          <button className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left">
            <div className="text-sm font-semibold text-slate-200">
              View Points History
            </div>
            <div className="text-xs text-slate-400">
              See credits, debits, and karma events (coming next).
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};
