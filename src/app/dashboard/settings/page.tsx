"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SignOutButton from "./SignOutButton";

export default function SettingsPage() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (mounted && user) {
        setEmail(user.email || "");
        setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher");
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your account and sign out.</p>
      </header>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>

        <dl className="mt-4 divide-y divide-slate-200">
          <div className="py-3 grid grid-cols-3 gap-4">
            <dt className="text-sm text-slate-600">Name</dt>
            <dd className="col-span-2 text-sm text-slate-900">{name || "-"}</dd>
          </div>
          <div className="py-3 grid grid-cols-3 gap-4">
            <dt className="text-sm text-slate-600">Email</dt>
            <dd className="col-span-2 text-sm text-slate-900">{email || "-"}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <SignOutButton variant="primary" />
        </div>
      </section>
    </div>
  );
}
