// src/pages/SignInPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, ensureUserRecord, getCurrentAuthUser } from "../api/authApi";

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("p@p.com");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If a user is already authenticated, skip the sign-in form and go home
  useEffect(() => {
    const check = async () => {
      try {
        const current = await getCurrentAuthUser();
        if (current) {
          await ensureUserRecord();
          navigate("/home", { replace: true });
          return;
        }
      } catch (e) {
        console.warn("SignInPage: getCurrentAuthUser failed:", e);
      } finally {
        setCheckingSession(false);
      }
    };

    check();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);

      try {
        await signIn(email.trim(), password);
      } catch (err: any) {
        const name = err?.name || "";
        if (name === "UserAlreadyAuthenticatedException") {
          console.log("SignInPage: user already authenticated, continuing.");
        } else {
          throw err;
        }
      }

      await ensureUserRecord();
      navigate("/home", { replace: true });
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      setError(err?.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-200">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Splash / logo */}
        <div className="flex flex-col items-center mb-2">
          <img
            src="/cofish-splash.png"
            alt="CoFish splash"
            className="w-32 h-32 object-cover rounded-full border border-sky-400/60 shadow-xl shadow-sky-900/70 mb-3"
          />
          <h1 className="text-2xl font-semibold text-sky-100 tracking-wide">
            CoFish
          </h1>
          <p className="text-xs text-slate-400">
            Trade real catches for real intel.
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4 text-slate-50">
            Sign in to continue
          </h2>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Email
              </label>
              <input
                className="w-full rounded-full bg-slate-950 border border-slate-700 px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Password
              </label>
              <input
                className="w-full rounded-full bg-slate-950 border border-slate-700 px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-amber-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 mt-2 text-sm disabled:opacity-70 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
