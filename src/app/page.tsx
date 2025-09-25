// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type Mode = "signin" | "signup";

// Minimal row shape for profiles upsert (no generated types needed)
type ProfilePayload = { id: string; full_name: string };

export default function LandingPage() {
  const router = useRouter();
  const supabase = getSupabase();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // signup only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNote(null);

    try {
      setLoading(true);

      if (mode === "signin") {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;

        router.push("/dashboard");
        return;
      }

      // --- SIGN UP ---
      if (!fullName.trim()) {
        setError("Please add your name.");
        return;
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpErr) throw signUpErr;

      const newUserId = data.user?.id ?? null;

      // Create/update `profiles` row (non-blocking).
      if (newUserId) {
        const payload = {
          id: newUserId,
          full_name: fullName.trim(),
        } as const satisfies ProfilePayload;

        try {
          // Without generated DB types, Supabase infers `never` for rows.
          // We validate `payload` shape above, then suppress the call-site error.
          // @ts-expect-error – no generated types for "profiles" table
          await supabase.from("profiles").upsert(payload, { onConflict: "id" });
        } catch (upErr) {
          // Not fatal; dashboard can read name from user_metadata
          console.warn("profiles upsert failed:", upErr);
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        router.push("/dashboard");
      } else {
        setNote("Check your email to confirm your account. You can sign in after confirming.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ivory">
      {/* Top bar (brand only) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand" />
            <span className="text-lg font-semibold text-brand-900">EduContact</span>
          </div>
          {/* (Removed Features/Why/FAQ links) */}
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Left: headline + value props + CTA */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-brand-900">
              Streamline Teacher–Family Communication
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              One-line logs that stay organized, quick filters by student, topic, or method, and
              exports for meetings or documentation — all in seconds.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button className="btn btn-brand" onClick={() => router.push("/demo")}>
                Try Demo
              </button>
            </div>

            {/* Value props */}
            <div id="features" className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4">
                <div className="text-sm font-semibold text-brand-900">Fast logging</div>
                <div className="mt-1 text-sm muted">One line per contact—stay organized.</div>
              </div>
              <div className="card p-4">
                <div className="text-sm font-semibold text-brand-900">Smart filters</div>
                <div className="mt-1 text-sm muted">Filter by student, method, or topic.</div>
              </div>
              <div className="card p-4">
                <div className="text-sm font-semibold text-brand-900">Download ready</div>
                <div className="mt-1 text-sm muted">Export any filtered set.</div>
              </div>
            </div>
          </div>

          {/* Right: Auth card */}
          <div className="card p-6 lg:mt-4">
            {/* Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
                  mode === "signin"
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
                  mode === "signup"
                    ? "bg-brand text-white"
                    : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            <h2 className="text-xl font-semibold">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm muted">
              {mode === "signin"
                ? "Log contact with families in seconds."
                : "Start organizing communications in minutes."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Full name</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.org"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              {note && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {note}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-brand w-full disabled:opacity-70">
                {loading
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Creating…"
                  : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            <p className="mt-3 text-xs muted">
              By continuing, you agree to our <a href="#" className="underline">terms</a>. You can sign
              out anytime in Settings.
            </p>
          </div>
        </div>
      </section>

      {/* Simple footer */}
      <footer className="border-t border-black/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex items-center justify-between">
          <p className="text-sm muted">© {new Date().getFullYear()} EduContact.</p>
          <div className="flex gap-4 text-sm">
            <a href="#" className="muted hover:underline">Privacy</a>
            <a href="#" className="muted hover:underline">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
