"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

type AuthMode = "signin" | "signup" | "magic-link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp, signInWithMagicLink, signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      } else if (mode === "signup") {
        if (!displayName.trim()) {
          setError("Please enter a display name");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(error.message);
        } else {
          setSuccess("Account created! Please check your email to verify your account.");
        }
      } else if (mode === "magic-link") {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess("Check your email for a magic link to sign in!");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-slideUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl"
        >
          ×
        </button>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900">
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "magic-link" && "Magic Link"}
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            {mode === "signin" && "Welcome back to Trivia Masters"}
            {mode === "signup" && "Join Trivia Masters today"}
            {mode === "magic-link" && "We'll send you a sign-in link"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={async () => {
            setError(null);
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
              setError(error.message);
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-all shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-slate-400">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="you@example.com"
              required
            />
          </div>

          {mode !== "magic-link" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition-all"
          >
            {loading ? "Loading..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Magic Link"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          {mode === "signin" && (
            <>
              <span className="text-slate-600">Don't have an account?</span>
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign up
              </button>
            </>
          )}
          {mode === "signup" && (
            <>
              <span className="text-slate-600">Already have an account?</span>
              <button
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-blue-600 font-semibold hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setMode(mode === "magic-link" ? "signin" : "magic-link");
              setError(null);
              setSuccess(null);
            }}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            {mode === "magic-link" ? "Use password instead" : "Use magic link instead"}
          </button>
        </div>
      </div>
    </div>
  );
}
