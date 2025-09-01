"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";

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

// Shapes for selects
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
type StudentMini = { id: string; first_name: string; last_name: string };

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
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) return;
      if (mounted) setUid(user.id);

      // ---- Profile name (runtime narrowing, no casts to `any`) ----
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      let profileFull: string | undefined;
      {
        const p = profile as unknown;
        if (typeof p === "object" && p !== null) {
          const v = (p as Record<string, unknown>)["full_name"];
          if (typeof v === "string" && v.trim().length > 0) profileFull = v;
        }
      }

      let metaFull: string | undefined;
      {
        const meta = user.user_metadata as unknown;
        if (typeof meta === "object" && meta !== null) {
          const v = (meta as Record<string, unknown>)["full_name"];
          if (typeof v === "string" && v.trim().length > 0) metaFull = v;
        }
      }

      const display = profileFull ?? metaFull ?? user.email?.split("@")[0] ?? "Teacher";
      if (mounted) setName(display);
      // ---- end profile name ----

      // Counts
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
      const { data: contactsRaw } = await supabase
        .from("contacts")
        .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      let recentList: RecentItem[] = [];
      if (contactsRaw && contactsRaw.length) {
        const contacts = contactsRaw as unknown as ContactRow[];
        const studentIds = Array.from(new Set(contacts.map((c) => c.student_id))).filter(
          (x): x is string => Boolean(x)
        );

        let map = new Map<string, StudentMini>();
        if (studentIds.length) {
          const { data: students } = await supabase
            .from("students")
            .select("id, first_name, last_name")
            .in("id", studentIds);

          const list = (students as unknown as StudentMini[] | null) ?? [];
          map = new Map(list.map((s) => [s.id, s]));
        }

        recentList = contacts.map((c) => ({
          id: c.id,
          subject: c.subject,
          summary: c.summary,
          occurred_at: c.occurred_at,
          created_at: c.created_at,
          method: c.method,
          category: c.category,
          student:
            c.student_id && map.get(c.student_id)
              ? {
                  first_name: map.get(c.student_id)!.first_name,
                  last_name: map.get(c.student_id)!.last_name,
                }
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
      .on("broadcast", { event: "student:created" }, (msg: { payload?: unknown }) => {
        const p = msg.payload as { owner_id?: string } | undefined;
        if (p?.owner_id !== uid) return;
        setTotalStudents((n) => n + 1);
      })
      .on("broadcast", { event: "contact:created" }, (msg: { payload?: unknown }) => {
        const p = msg.payload as
          | {
              id?: string;
              owner_id?: string;
              occurred_at?: string;
              created_at?: string;
              method?: string;
              category?: string | null;
              subject?: string | null;
              summary?: string | null;
              student?: { first_name: string; last_name: string } | null;
            }
          | undefined;

        if (!p || p.owner_id !== uid || !p.id || !p.occurred_at || !p.method) return;

        setTotalContacts((n) => n + 1);

        // bump week count if occurred_at is this week
        const occurred = new Date(p.occurred_at);
        if (occurred >= startOfWeekMonday(new Date())) {
          setContactsThisWeek((n) => n + 1);
        }

        // Add to recent and keep latest 5 by created_at
        const createdAt = p.created_at ?? new Date().toISOString();
        setRecent((prev) => {
          const nextItem: RecentItem = {
            id: p.id!,
            occurred_at: p.occurred_at!,
            created_at: createdAt,
            method: p.method!,
            category: p.category ?? null,
            subject: p.subject ?? null,
            summary: p.summary ?? null,
            student: p.student ?? null,
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
        <h1>Welcome, {name}</h1>
        <p className="muted mt-1">Here’s a quick snapshot of your classroom communications.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Total Students</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Total Contacts</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{totalContacts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Contacts This Week</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{contactsThisWeek}</div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Link href="/dashboard/contacts">
            <Button>New Contact</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recent === null ? (
            <div className="mt-2 text-sm text-slate-600">Loading…</div>
          ) : recent.length === 0 ? (
            <EmptyState title="No contact logs yet." hint="Create your first one to see activity here." />
          ) : (
            <ul className="mt-2 divide-y divide-slate-200">
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
        </CardContent>
      </Card>
    </div>
  );
}
