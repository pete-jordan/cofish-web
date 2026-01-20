
// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUserProfileWithBalance,
  signOut,
} from "../api/authApi";
import type { UserProfile } from "../api/authApi";

const TEST_MODE_STORAGE_KEY = "cofish_test_mode";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(() => {
    try {
      return localStorage.getItem(TEST_MODE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

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
    // Navigate to post catch page instead of simulating
    navigate("/post-catch");
  };

  const handleGoToTargetZones = () => {
    navigate("/targetzones");
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

  const avatarLetter =
    profile.displayName?.[0]?.toUpperCase() ||
    profile.email?.[0]?.toUpperCase() ||
    "A";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">
              CoFish Points
            </div>
            <div className="text-3xl font-semibold text-emerald-400 drop-shadow-sm">
              {profile.pointsBalance}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-sky-200 border border-slate-600">
              {avatarLetter}
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Log out
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Welcome, {profile.displayName || profile.email}
        </div>
      </div>

      {/* Main content */}
      <main className="px-4 py-4 space-y-3">
        {/* Earn Points */}
        <button
          className="w-full rounded-2xl bg-slate-900 border border-emerald-600/60 px-4 py-3 text-left shadow-md shadow-emerald-900/30"
          onClick={handleEarnPoints}
        >
          <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
            Earn Points
          </div>
          <div className="flex justify-between items-center mt-1">
            <div>
              <div className="text-sm font-semibold text-slate-50">
                Post a Catch
              </div>
              <div className="text-xs text-slate-400">
                Record a video of your catch to earn{" "}
                <span className="text-emerald-300 font-semibold">+100 pts</span>.
              </div>
            </div>
            <div className="text-xs text-emerald-300 font-semibold border border-emerald-500/60 rounded-full px-3 py-1">
              +100
            </div>
          </div>
        </button>

        {/* Spend Points – go to TargetZones screen */}
        <button
          className="w-full rounded-2xl bg-slate-900 border border-sky-600/60 px-4 py-3 text-left shadow-md shadow-sky-900/40"
          onClick={handleGoToTargetZones}
        >
          <div className="text-xs font-semibold text-sky-300 uppercase tracking-wide">
            Spend Points
          </div>
          <div className="flex justify-between items-center mt-1">
            <div>
              <div className="text-sm font-semibold text-slate-50">
                Buy a TargetZone
              </div>
              <div className="text-xs text-slate-400">
                Choose Standard or Precision locations.
              </div>
            </div>
            <div className="text-xs text-sky-200 font-semibold border border-sky-500/60 rounded-full px-3 py-1">
              100–300 pts
            </div>
          </div>
        </button>

        {/* View History */}
        <button
          className="w-full rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 text-left shadow-sm shadow-slate-900/40"
          onClick={handleViewHistory}
        >
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            History
          </div>
          <div className="flex justify-between items-center mt-1">
            <div>
              <div className="text-sm font-semibold text-slate-50">
                View Points History
              </div>
              <div className="text-xs text-slate-400">
                See all catches, purchases, and karma events in one ledger.
              </div>
            </div>
            <div className="text-xs text-slate-400 border border-slate-600 rounded-full px-3 py-1">
              View
            </div>
          </div>
        </button>

        {/* Test Mode Toggle */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              const newValue = !testMode;
              setTestMode(newValue);
              try {
                localStorage.setItem(TEST_MODE_STORAGE_KEY, String(newValue));
              } catch {
                // ignore
              }
            }}
            className={`w-full rounded-xl px-4 py-3 text-left border ${
              testMode
                ? "border-yellow-600/60 bg-yellow-950/20"
                : "border-slate-700 bg-slate-900/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Test Mode
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {testMode
                    ? "Enabled - Shows debug info and location picker"
                    : "Disabled - Normal operation"}
                </div>
              </div>
              <div
                className={`w-12 h-6 rounded-full transition-colors ${
                  testMode ? "bg-yellow-600" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform mt-0.5 ${
                    testMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};
