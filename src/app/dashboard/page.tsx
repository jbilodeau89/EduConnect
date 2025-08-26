"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function DashboardPage() {
  const [name, setName] = useState<string>("Teacher");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (mounted && user) {
        const display = user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher";
        setName(display);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Here’s a quick snapshot of your classroom communications.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Total Students</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Total Contacts</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Contacts This Week</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <Link
            href="/dashboard/contacts"
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            New Contact
          </Link>
        </div>
        <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">
            No contact logs yet. Create your first one to see recent activity here.
          </p>
        </div>
      </section>
    </div>
  );
}
