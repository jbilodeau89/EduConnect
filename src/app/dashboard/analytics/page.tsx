// src/app/dashboard/analytics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabaseClient";

// ---- Dynamic Recharts imports (client-only) ----
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });

// ---- Types (no `any`) ----
type TimeRange = "week" | "month" | "term" | "semester" | "year";
type Method = "email" | "phone" | "in_person" | "video" | "message" | "other";
type Category =
  | "academic"
  | "behavior"
  | "attendance"
  | "positive"
  | "admin"
  | "other"
  | null;

type ContactRow = {
  id: string;
  owner_id: string;
  student_id: string | null;
  occurred_at: string; // ISO
  created_at: string;  // ISO
  method: Method;
  category: Category;
};

const METHOD_OPTIONS: { value: "" | Method; label: string }[] = [
  { value: "", label: "All methods" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
  { value: "video", label: "Video" },
  { value: "message", label: "Message" },
  { value: "other", label: "Other" },
];

const REASON_OPTIONS: { value: "" | Exclude<Category, null>; label: string }[] = [
  { value: "", label: "All reasons" },
  { value: "academic", label: "Academic" },
  { value: "behavior", label: "Behavior" },
  { value: "attendance", label: "Attendance" },
  { value: "positive", label: "Positive" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

// ---- Time helpers ----
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const startOfWeekMonday = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  return startOfDay(x);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addWeeks = (d: Date, n: number) => addDays(d, n * 7);
const weeksBetween = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
};
const academicYearRange = (anchor: Date) => {
  // Academic year starts Aug 1. If current month < Aug, AY started last year.
  const year = anchor.getMonth() >= 7 ? anchor.getFullYear() : anchor.getFullYear() - 1;
  const start = startOfDay(new Date(year, 7, 1)); // Aug = 7
  const end = endOfDay(new Date(year + 1, 6, 31)); // End of July next year
  return { start, end };
};

function rangeFor(timeRange: TimeRange): { start: Date; end: Date; bucket: "day" | "week" } {
  const now = new Date();
  const end = endOfDay(now);

  switch (timeRange) {
    case "week": {
      const start = startOfWeekMonday(now);
      return { start, end, bucket: "day" };
    }
    case "month": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 29); // last 30 days incl today
      return { start, end, bucket: "day" };
    }
    case "term": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 7 * 12); // ~12 weeks
      return { start, end, bucket: "week" };
    }
    case "semester": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 7 * 20); // ~20 weeks
      return { start, end, bucket: "week" };
    }
    case "year": {
      const { start } = academicYearRange(now);
      return { start, end, bucket: "week" };
    }
  }
}

// ---- Label helpers ----
const fmtDay = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtWeekLabel = (d: Date) =>
  `Week of ${fmtDay(d)}`;

// ---- Component ----
export default function AnalyticsPage() {
  const [uid, setUid] = useState<string | null>(null);

  // filters
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [methodFilter, setMethodFilter] = useState<"" | Method>("");
  const [reasonFilter, setReasonFilter] = useState<"" | Exclude<Category, null>>("");

  // data
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // get user id once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id ?? null;
      if (mounted) setUid(userId);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // fetch whenever filters change
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;
    const { start, end } = rangeFor(timeRange);

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const supabase = getSupabase();

        let query = supabase
          .from("contacts")
          .select(
            "id, owner_id, student_id, occurred_at, created_at, method, category"
          )
          .eq("owner_id", uid)
          .gte("occurred_at", start.toISOString())
          .lte("occurred_at", end.toISOString());

        if (methodFilter) query = query.eq("method", methodFilter);
        if (reasonFilter) query = query.eq("category", reasonFilter);

        const { data, error } = await query;

        if (error) throw error;
        if (cancelled) return;

        // Safe cast (we selected exact columns)
        setRows((data ?? []) as unknown as ContactRow[]);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, timeRange, methodFilter, reasonFilter]);

  // ---- Aggregations (pure in-memory) ----
  const { trendData, methodData, reasonData, kpis } = useMemo(() => {
    const list = rows ?? [];
    const { start, end, bucket } = rangeFor(timeRange);

    // total contacts
    const totalContacts = list.length;

    // students reached
    const uniqueStudents = new Set<string>();
    for (const r of list) {
      if (r.student_id) uniqueStudents.add(r.student_id);
    }
    const studentsReached = uniqueStudents.size;

    // avg per week
    const weeks = weeksBetween(start, end);
    const avgPerWeek = Math.round((totalContacts / weeks) * 10) / 10;

    // trend
    const trendMap = new Map<string, number>(); // key -> count
    if (bucket === "day") {
      for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) {
        trendMap.set(d.toISOString().slice(0, 10), 0);
      }
      for (const r of list) {
        const dayKey = r.occurred_at.slice(0, 10); // YYYY-MM-DD
        if (trendMap.has(dayKey)) trendMap.set(dayKey, (trendMap.get(dayKey) ?? 0) + 1);
      }
    } else {
      for (let d = startOfWeekMonday(start); d <= end; d = addWeeks(d, 1)) {
        trendMap.set(`W:${d.toISOString().slice(0, 10)}`, 0);
      }
      for (const r of list) {
        const dt = new Date(r.occurred_at);
        const wk = startOfWeekMonday(dt).toISOString().slice(0, 10);
        const key = `W:${wk}`;
        if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
      }
    }

    const trendData = Array.from(trendMap.entries()).map(([key, count]) => {
      if (key.startsWith("W:")) {
        const iso = key.slice(2);
        const weekStart = new Date(iso + "T00:00:00Z");
        return { label: fmtWeekLabel(weekStart), count };
      }
      // day
      const day = new Date(key + "T00:00:00");
      return { label: fmtDay(day), count };
    });

    // method distribution
    const methodCount = new Map<string, number>();
    for (const r of list) {
      const k = r.method;
      methodCount.set(k, (methodCount.get(k) ?? 0) + 1);
    }
    const methodLabel = (m: string) =>
      METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m;
    const methodData = Array.from(methodCount.entries()).map(([k, v]) => ({
      label: methodLabel(k),
      count: v,
    }));

    // reason distribution
    const reasonCount = new Map<string, number>();
    for (const r of list) {
      const k = r.category ?? "uncategorized";
      reasonCount.set(k, (reasonCount.get(k) ?? 0) + 1);
    }
    const reasonLabel = (c: string) =>
      REASON_OPTIONS.find((o) => o.value === c)?.label ??
      (c === "uncategorized" ? "Uncategorized" : c);
    const reasonData = Array.from(reasonCount.entries()).map(([k, v]) => ({
      label: reasonLabel(k),
      count: v,
    }));

    return {
      trendData,
      methodData,
      reasonData,
      kpis: { totalContacts, studentsReached, avgPerWeek },
    };
  }, [rows, timeRange]);

  // ---- UI ----
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm muted">
          Track your communication patterns and progress toward goals.
        </p>
      </header>

      {/* Filters */}
      <section className="card p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide muted mb-1 block">
              Time range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="rounded-lg border px-3 py-2 text-sm w-full"
            >
              <option value="week">This week</option>
              <option value="month">Last 30 days</option>
              <option value="term">This term (~12 weeks)</option>
              <option value="semester">This semester (~20 weeks)</option>
              <option value="year">Academic year</option>
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide muted mb-1 block">
              Method
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as "" | Method)}
              className="rounded-lg border px-3 py-2 text-sm w-full"
            >
              {METHOD_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide muted mb-1 block">
              Reason
            </label>
            <select
              value={reasonFilter}
              onChange={(e) =>
                setReasonFilter(e.target.value as "" | Exclude<Category, null>)
              }
              className="rounded-lg border px-3 py-2 text-sm w-full"
            >
              {REASON_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              className="btn w-full"
              onClick={() => {
                setMethodFilter("");
                setReasonFilter("");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <div className="text-sm muted">Total contacts</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis.totalContacts}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm muted">Students reached</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis.studentsReached}
          </div>
        </div>
        <div className="card p-6">
          <div className="text-sm muted">Average per week</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">
            {kpis.avgPerWeek}
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Trend */}
        <div className="card p-4 sm:p-6 xl:col-span-2">
          <div className="text-lg font-semibold mb-2">Trend</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#701C1C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Method */}
        <div className="card p-4 sm:p-6">
          <div className="text-lg font-semibold mb-2">By method</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#F0EAD6" stroke="#701C1C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Reason */}
        <div className="card p-4 sm:p-6 xl:col-span-3">
          <div className="text-lg font-semibold mb-2">By reason</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#F0EAD6" stroke="#701C1C" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Loading / error states */}
      {loading && (
        <div className="text-sm muted">Loading analytics…</div>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}
      {!loading && rows && rows.length === 0 && (
        <div className="rounded-lg border border-black/10 p-4 text-sm muted">
          No data in this range. Try adjusting filters.
        </div>
      )}
    </div>
  );
}
