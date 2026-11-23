"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, User, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated) {
          window.location.href = "/admin";
          return;
        }
      } catch (err) {
        // Ignore network errors on check
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        window.location.href = "/admin";
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-neutral-100 flex flex-col justify-between selection:bg-[#E50914] selection:text-white font-sans">
      {/* Discreet Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-[#E50914] font-black text-xl tracking-tight uppercase">STREAMFLIX</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition px-2.5 py-1.5 bg-neutral-900 border border-white/10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </Link>
      </header>

      {/* Login Card */}
      <main className="flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#141414] border border-white/10 p-6 md:p-8 shadow-2xl relative">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-9 h-9 bg-neutral-900 border border-white/10 flex items-center justify-center text-neutral-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">Sign In</h1>
              <p className="text-[11px] text-neutral-400">Enter your credentials to continue</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-950/50 border border-red-500/30 text-red-300 text-xs px-3 py-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or email"
                  autoFocus
                  className="w-full bg-[#0e0e0e] border border-white/10 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#E50914] transition rounded-none font-sans"
                />
                <User className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0e0e0e] border border-white/10 px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#E50914] transition rounded-none font-mono tracking-widest"
                />
                <Lock className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full bg-[#E50914] hover:bg-[#b80710] disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold text-xs tracking-wider uppercase py-2.5 transition flex items-center justify-center gap-2 rounded-none cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="px-6 py-4 text-center border-t border-white/5">
        <span className="text-[10px] text-neutral-600 font-mono">STREAMFLIX &bull; ALL RIGHTS RESERVED</span>
      </footer>
    </div>
  );
}
