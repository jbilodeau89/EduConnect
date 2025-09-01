"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";

type RecentItem = {
  id: string;
  occurred_at: string;              // ISO
  created_at: string;               // ISO, used for ordering
  method: string;
  category: string | null;
  subject: string | null;
  summary: string | null;
  student: { first_name: string; last_name: string } | null;
};

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

// Narrow unknown → non-empty string (or undefined)
const toNonEmpty = (val: unknown): string | undefined => {
  if (typeof val !== "string") return undefined;
  const s = val.trim();
  return s.length ? s : undefined;
};

export default function DashboardPage() {
  const [name, setName] = useState<string>("Teacher");
  const [uid, setUid] = useState<string | null>(null);

  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [contactsThisWeek, setContactsThisWeek] = useState<number>(0);
  const [recent, setRecent] = useState<RecentItem[] | null>(null);

  // Filters
  const [studentFilter, setStudentFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState(""); // NEW

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;
      if (!user) return;
      if (mounted) setUid(user.id);

      // ---- Profile name (strict-safe) ----
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const profileFull = toNonEmpty(
        typeof profile === "object" && profile !== null
          ? (profile as Record<string, unknown>)["full_name"]
          : undefined
      );

      const metaFull = toNonEmpty(
        typeof user.user_metadata === "object" && user.user_metadata !== null
          ? (user.user_metadata as Record<string, unknown>)["full_name"]
          : undefined
      );

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

      // Recent activity: newest first by created_at
      const { data: contactsRaw } = await supabase
        .from("contacts")
        .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

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

          const list = ((students as unknown) as StudentMini[] | null) ?? [];
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

        // Add to recent and keep latest 20 by created_at
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
          return next.slice(0, 20);
        });
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [uid]);

  // Derived: filtered recent items (Student, Reason, Method)
  const filteredRecent = useMemo(() => {
    if (!recent) return null;
    const s = studentFilter.trim().toLowerCase();
    const r = reasonFilter.trim().toLowerCase();
    const m = methodFilter.trim().toLowerCase(); // NEW

    return recent.filter((item) => {
      const studentName = item.student ? `${item.student.last_name}, ${item.student.first_name}`.toLowerCase() : "";
      const reason = item.category?.toLowerCase() ?? "";
      const method = item.method?.toLowerCase() ?? "";

      const okStudent = s ? studentName.includes(s) : true;
      const okReason = r ? reason.includes(r) : true;
      const okMethod = m ? method === m : true; // exact match for method values

      return okStudent && okReason && okMethod;
    });
  }, [recent, studentFilter, reasonFilter, methodFilter]);

  return (
    <div className="space-y-6">
      {/* Brand banner + CTA */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white shadow-sm">
        <div className="bg-brand text-white px-6 py-4 flex items-center justify-between">
          <div className="font-semibold">EduContact</div>
          <div className="text-sm opacity-90">Persian Plum • Ivory Quartz</div>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Welcome, {name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Here’s a quick snapshot of your classroom communications.
            </p>
          </div>
          <Link href="/dashboard/contacts" className="inline-flex">
            <Button className="btn-brand bg-brand-700 hover:bg-brand-800">New Contact</Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Total Students</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{totalStudents}</div>
            <div className="mt-4 h-1 rounded-full bg-brand-700" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Total Contacts</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{totalContacts}</div>
            <div className="mt-4 h-1 rounded-full bg-brand-700" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Contacts This Week</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{contactsThisWeek}</div>
            <div className="mt-4 h-1 rounded-full bg-ivory" />
          </CardContent>
        </Card>
      </section>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex gap-2">
            <input
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              placeholder="Filter by student…"
              className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
            />
            <input
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              placeholder="Filter by reason…"
              className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
              title="Filter by method"
            >
              <option value="">All methods</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="in_person">In person</option>
              <option value="video">Video</option>
              <option value="message">Message</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardHeader>

        <div className="h-1 bg-gradient-to-r from-brand-700 to-ivory" />

        <CardContent>
          {filteredRecent === null ? (
            <div className="mt-2 text-sm text-slate-600">Loading…</div>
          ) : filteredRecent.length === 0 ? (
            <EmptyState title="No recent contacts." hint="Try adjusting your filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-2 pr-4">Student</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Method</th>
                    <th className="py-2 pr-4">Reason</th>
                    <th className="py-2 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {filteredRecent.map((c) => {
                    const d = new Date(c.occurred_at);
                    const dateStr = d.toLocaleDateString();
                    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                    return (
                      <tr key={c.id} className="border-t border-slate-200">
                        <td className="py-2 pr-4">
                          {c.student ? `${c.student.last_name}, ${c.student.first_name}` : "Unknown student"}
                        </td>
                        <td className="py-2 pr-4">{dateStr}</td>
                        <td className="py-2 pr-4">{timeStr}</td>
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center rounded-full bg-ivory text-brand-900 ring-1 ring-brand-200 px-2.5 py-0.5 text-xs font-medium">
                            {c.method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {c.category ? (
                            <span className="inline-flex items-center rounded-full bg-ivory text-brand-900 ring-1 ring-brand-200 px-2.5 py-0.5 text-xs font-medium">
                              {c.category}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {c.subject?.trim() || c.summary?.trim() || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
