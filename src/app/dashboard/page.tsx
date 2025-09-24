"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { getAppChannel } from "@/lib/realtime";
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

    const channel = getAppChannel();
    if (!channel) return;

    const sub = channel
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-brand/15 bg-white text-slate-900 shadow-[0_35px_65px_-45px_rgba(15,23,42,0.08)]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand/10 via-transparent to-accent/10"
          aria-hidden
        />
        <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(30,64,175,0.18),transparent_60%)]" aria-hidden />
        <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">
              Welcome back, {name}
            </p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Guide every family partnership with confidence.
            </h1>
            <p className="text-sm text-slate-600">
              Today’s dashboard highlights the students you are connecting with most, the methods you rely on,
              and the conversations still waiting for a follow-up.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-br from-brand to-brand-700 p-6 text-left text-white shadow-lg shadow-brand/20">
            <span className="text-xs uppercase tracking-[0.3em] text-white/80">Weekly impact</span>
            <div className="text-4xl font-semibold">{contactsThisWeek}</div>
            <p className="text-sm text-white/85">
              logged touchpoints with families in the last seven days.
            </p>
            <Link href="/dashboard/contacts" className="inline-flex">
              <Button variant="secondary" className="bg-white text-brand shadow-sm shadow-black/10 hover:bg-white">
                Log a touchpoint
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Total students</span>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">Roster</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-brand">{totalStudents}</p>
                <p className="mt-1 text-xs text-slate-500">active learners in your care</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-brand/10 ring-4 ring-brand/20" aria-hidden />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Lifetime contacts</span>
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent-500">History</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-brand">{totalContacts}</p>
                <p className="mt-1 text-xs text-slate-500">family updates captured</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-accent/20 ring-4 ring-accent/30" aria-hidden />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Rhythm this week</span>
              <span className="rounded-full bg-brand/5 px-3 py-1 text-xs font-medium text-brand">Cadence</span>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold text-brand">{contactsThisWeek}</p>
                <p className="mt-1 text-xs text-slate-500">touchpoints since Monday</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-brand/10 ring-4 ring-brand/10" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 border-b border-brand/10 bg-white/60 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-brand">Recent family conversations</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Search across your latest updates to prepare for conferences and check-ins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              placeholder="Student name"
              className="w-40 rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <input
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              placeholder="Reason"
              className="w-36 rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-36 rounded-xl border border-brand/20 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStudentFilter("");
                setReasonFilter("");
                setMethodFilter("");
              }}
              className="px-4"
            >
              Clear
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {filteredRecent === null ? (
            <div className="px-6 py-8 text-sm text-slate-600">Loading…</div>
          ) : filteredRecent.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState title="No recent contacts." hint="Try adjusting your filters." />
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-brand/10 text-left text-sm">
                <thead className="bg-brand/5 text-slate-600">
                  <tr>
                    <th className="py-3 pl-6 pr-4 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand/10 bg-white">
                  {filteredRecent.map((c) => {
                    const d = new Date(c.occurred_at);
                    const dateStr = d.toLocaleDateString();
                    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                    return (
                      <tr key={c.id} className="transition hover:bg-brand/5">
                        <td className="whitespace-nowrap py-4 pl-6 pr-4">
                          <div className="font-medium text-slate-900">
                            {c.student ? `${c.student.last_name}, ${c.student.first_name}` : "Unknown student"}
                          </div>
                          <div className="text-xs text-slate-500">{c.subject?.trim() || c.summary?.trim() || "—"}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{dateStr}</td>
                        <td className="px-4 py-4 text-slate-700">{timeStr}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-medium capitalize text-brand">
                            {c.method.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {c.category ? (
                            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium capitalize text-accent-500">
                              {c.category}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-700">
                          {c.summary?.trim() || "—"}
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
