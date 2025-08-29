"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Mode = "signin" | "signup";

export default function HomePage() {
  const router = useRouter();
  const search = useSearchParams();

  // allow ?mode=signup or ?mode=signin; default signin
  const qpMode = (search.get("mode") as Mode) || "signin";
  const next = search.get("next") || null;

  const [mode, setMode] = useState<Mode>(qpMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    // keep mode in sync if the query param changes
    if (qpMode !== mode) setMode(qpMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpMode]);

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !password || (mode === "signup" && !fullName)) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        // Sign up; if email confirmations are ON, the confirmation link will land on /onboarding/subscribe
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${baseUrl}/onboarding/subscribe`,
          },
        });
        if (signUpError) throw signUpError;

        const { user, session } = data;

        // If confirmations are OFF, we have a session immediately
        if (session && user) {
          // create/update profile
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({ id: user.id, full_name: fullName });
          if (profileError) throw profileError;

          router.push("/onboarding/subscribe");
          return;
        }

        // If confirmations are ON, user must click the email link first
        setInfo("Check your email to confirm your address. After confirming, you’ll be taken to secure checkout.");
        return;
      }

      // Sign in: honor ?next (used when we bounced them here to require auth), else dashboard
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      router.push(next || "/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-slate-900">EduContact</h1>
            <p className="mt-2 text-slate-600 text-sm">A teacher-friendly way to log communications.</p>
          </div>

          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
            <div className="grid grid-cols-2 gap-2 mb-6" role="tablist" aria-label="Auth mode">
              <button
                role="tab"
                aria-selected={mode === "signin"}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                  mode === "signin"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setMode("signin")}
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={mode === "signup"}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                  mode === "signup"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            {info && (
              <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {info}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    id="full_name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Jane Doe"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="you@school.org"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-70"
              >
                {submitting
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            By continuing, you agree to our terms. You can sign out anytime in Settings.
          </p>
        </div>
      </div>
    </main>
  );
}
