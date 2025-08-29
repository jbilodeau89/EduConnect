"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";

type RecentItem = {
  id: string;
  occurred_at: string;
  created_at: string; // used for ordering
  method: string;
  category: string | null;
  subject: string | null;
  summary: string | null;
  student: { first_name: string; last_name: string } | null;
};

export default function DashboardPage() {
  const [name, setName] = useState<string>("Teacher");
  const [uid, setUid] = useState<string | null>(null);

  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [contactsThisWeek, setContactsThisWeek] = useState<number>(0);
  const [recent, setRecent] = useState<RecentItem[] | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) return;
      if (mounted) setUid(user.id);

      // Profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const display =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Teacher";
      if (mounted) setName(display);

      // Counts
      const [{ count: studentsCount }, { count: contactsCount }] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("contacts").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
      ]);

      // This week (Mon 00:00 local)
      const now = new Date();
      const day = now.getDay(); // 0=Sun
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const { count: weekCount } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .gte("occurred_at", monday.toISOString());

      // Recent activity: sort by created_at (submission time)
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      let recentList: RecentItem[] = [];
      if (contacts && contacts.length) {
        const studentIds = Array.from(new Set(contacts.map((c) => c.student_id)));
        const { data: students } = await supabase
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds);

        const map = new Map(students?.map((s) => [s.id, s]) ?? []);
        recentList = contacts.map((c) => ({
          id: c.id,
          subject: c.subject,
          summary: c.summary,
          occurred_at: c.occurred_at,
          created_at: c.created_at,
          method: c.method,
          category: c.category,
          student: map.get(c.student_id)
            ? { first_name: map.get(c.student_id)!.first_name, last_name: map.get(c.student_id)!.last_name }
            : null,
        }));
      }

      if (!mounted) return;
      setTotalStudents(studentsCount ?? 0);
      setTotalContacts(contactsCount ?? 0);
      setContactsThisWeek(weekCount ?? 0);
      setRecent(recentList);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Realtime broadcasts → instant updates
  useEffect(() => {
    if (!uid) return;

    const sub = appChannel
      .on("broadcast", { event: "student:created" }, (payload) => {
        const ownerId = (payload.payload as any)?.owner_id;
        if (ownerId !== uid) return;
        setTotalStudents((n) => n + 1);
      })
      .on("broadcast", { event: "contact:created" }, (payload) => {
        const p: any = payload.payload || {};
        if (p.owner_id !== uid) return;

        setTotalContacts((n) => n + 1);

        // bump week count if occurred_at is this week
        try {
          const occurred = new Date(p.occurred_at);
          const now = new Date();
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(now.setDate(diff));
          monday.setHours(0, 0, 0, 0);
          if (occurred >= monday) setContactsThisWeek((n) => n + 1);
        } catch {}

        // Add to recent and keep latest 5 by created_at
        setRecent((prev) => {
          const nextItem: RecentItem = {
            id: p.id,
            occurred_at: p.occurred_at,
            created_at: p.created_at ?? new Date().toISOString(),
            method: p.method,
            category: p.category ?? null,
            subject: p.subject ?? null,
            summary: p.summary ?? null,
            student: p.student ?? null,
          };
          const next = [nextItem, ...(prev ?? [])];
          next.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
          return next.slice(0, 5);
        });
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [uid]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-slate-600">Here’s a quick snapshot of your classroom communications.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Total Students</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{totalStudents}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Total Contacts</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{totalContacts}</div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
          <div className="text-sm text-slate-600">Contacts This Week</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{contactsThisWeek}</div>
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

        {recent === null ? (
          <div className="mt-6 text-sm text-slate-600">Loading…</div>
        ) : recent.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-600">No contact logs yet. Create your first one to see activity here.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {recent.map((c) => (
              <li key={c.id} className="py-3">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">
                    {c.student ? `${c.student.last_name}, ${c.student.first_name}` : "Unknown student"}
                  </div>
                  <div className="text-slate-600">
                    {new Date(c.occurred_at).toLocaleString()} · {c.method.replace("_", " ")}
                    {c.category ? ` · ${c.category}` : ""}
                  </div>
                  {c.subject && <div className="text-slate-900 mt-1">{c.subject}</div>}
                  {c.summary && <div className="text-slate-700 mt-1">{c.summary}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
