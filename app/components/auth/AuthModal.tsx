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

  const { signIn, signUp, signInWithMagicLink } = useAuth();

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
