"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import SignOutButton from "./SignOutButton";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) return;

      if (mounted) setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (mounted) setFullName(profile?.full_name ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your account.</p>
      </header>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <div className="mt-4 text-sm text-slate-700">
          <div><span className="text-slate-500">Name:</span> {fullName ?? "—"}</div>
          <div className="mt-1"><span className="text-slate-500">Email:</span> {email ?? "—"}</div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Session</h2>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
