"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
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

// Narrow local row types to match selects
type ContactRow = {
  id: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  created_at: string;
  method: string;
  category: string | null;
  student_id: string | null;
};
type StudentRow = { id: string; first_name: string; last_name: string };

const startOfWeekMonday = (d: Date) => {
  const now = new Date(d);
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
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
      try {
        const supabase = getSupabase();

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user ?? null;
        if (!user) {
          if (mounted) {
            setUid(null);
            setRecent([]);
          }
          return;
        }
        if (mounted) setUid(user.id);

        // Profile name (fallback to email local-part)
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const display =
          (profile as { full_name?: string } | null)?.full_name ||
          (user.email ? user.email.split("@")[0] : null) ||
          "Teacher";
        if (mounted) setName(display);

        // Counts in parallel
        const [{ count: studentsCount }, { count: contactsCount }] = await Promise.all([
          supabase.from("students").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
          supabase.from("contacts").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
        ]);

        // This week (Mon 00:00 local)
        const monday = startOfWeekMonday(new Date());
        const { count: weekCount } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .gte("occurred_at", monday.toISOString());

        // Recent activity: sort by created_at (submission time)
        const { data: contactsData } = await supabase
          .from("contacts")
          .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        const contacts: ContactRow[] = (contactsData ?? []) as unknown as ContactRow[];

        let recentList: RecentItem[] = [];
        if (contacts.length) {
          const studentIds = Array.from(
            new Set(
              contacts
                .map((c) => c.student_id)
                .filter((id): id is string => typeof id === "string" && id.length > 0)
            )
          );

          let map = new Map<string, { first_name: string; last_name: string }>();
          if (studentIds.length > 0) {
            const { data: studentsData } = await supabase
              .from("students")
              .select("id, first_name, last_name")
              .in("id", studentIds);

            const students: StudentRow[] = (studentsData ?? []) as unknown as StudentRow[];
            map = new Map(students.map((s) => [s.id, { first_name: s.first_name, last_name: s.last_name }]));
          }

          recentList = contacts.map((c) => ({
            id: c.id,
            subject: c.subject,
            summary: c.summary,
            occurred_at: c.occurred_at,
            created_at: c.created_at,
            method: c.method,
            category: c.category,
            student: c.student_id ? map.get(c.student_id) ?? null : null,
          }));
        }

        if (!mounted) return;
        setTotalStudents(studentsCount ?? 0);
        setTotalContacts(contactsCount ?? 0);
        setContactsThisWeek(weekCount ?? 0);
        setRecent(recentList);
      } catch {
        if (mounted) {
          setTotalStudents(0);
          setTotalContacts(0);
          setContactsThisWeek(0);
          setRecent([]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Realtime broadcasts → instant updates
  useEffect(() => {
    if (!uid) return;

    const sub = appChannel
      .on("broadcast", { event: "student:created" }, (msg: { payload?: unknown }) => {
        const p = msg?.payload as { owner_id?: string } | undefined;
        if (!p || p.owner_id !== uid) return;
        setTotalStudents((n) => n + 1);
      })
      .on("broadcast", { event: "contact:created" }, (msg: { payload?: unknown }) => {
        const p = msg?.payload as {
          id?: string;
          owner_id?: string;
          occurred_at?: string;
          created_at?: string;
          method?: string;
          category?: string | null;
          subject?: string | null;
          summary?: string | null;
          student?: { first_name: string; last_name: string } | null;
        } | undefined;

        if (!p || p.owner_id !== uid || !p.id || !p.occurred_at || !p.method) return;

        setTotalContacts((n) => n + 1);

        // bump week count if occurred_at is this week
        try {
          const occurred = new Date(p.occurred_at);
          if (occurred >= startOfWeekMonday(new Date())) {
            setContactsThisWeek((n) => n + 1);
          }
        } catch {
          /* ignore parse issues */
        }

        // Add to recent and keep latest 5 by created_at
        const createdAt = p.created_at ?? new Date().toISOString();
        const studentVal = p.student && p.student.first_name && p.student.last_name ? p.student : null;

        setRecent((prev) => {
          const nextItem: RecentItem = {
            id: p.id!,
            occurred_at: p.occurred_at!,
            created_at: createdAt,
            method: p.method!,
            category: p.category ?? null,
            subject: p.subject ?? null,
            summary: p.summary ?? null,
            student: studentVal,
          };
          const next = [nextItem, ...(prev ?? [])];
          next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
        <p className="mt-1 text-sm text-slate-600">
          Here’s a quick snapshot of your classroom communications.
        </p>
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
            <p className="text-sm text-slate-600">
              No contact logs yet. Create your first one to see activity here.
            </p>
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
                    {new Date(c.occurred_at).toLocaleString()} · {c.method.replace(/_/g, " ")}
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
