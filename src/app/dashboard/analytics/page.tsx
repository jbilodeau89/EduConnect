// src/app/dashboard/analytics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
type TimeRange = "week" | "month" | "term" | "semester" | "year" | "custom";
type Method = "email" | "phone" | "in_person" | "video" | "message" | "other";
type Category =
  | "academic"
  | "behavior"
  | "attendance"
  | "positive"
  | "admin"
  | "other"
  | null;

type Reason = Exclude<Category, null>;

type ContactRow = {
  id: string;
  owner_id: string;
  student_id: string | null;
  occurred_at: string; // ISO
  created_at: string;  // ISO
  method: Method;
  category: Category;
};

const METHOD_FILTERS: Array<{ value: Method; label: string }> = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In person" },
  { value: "video", label: "Video" },
  { value: "message", label: "Message" },
  { value: "other", label: "Other" },
];

const REASON_FILTERS: Array<{ value: Reason; label: string }> = [
  { value: "academic", label: "Academic" },
  { value: "behavior", label: "Behavior" },
  { value: "attendance", label: "Attendance" },
  { value: "positive", label: "Positive" },
  { value: "admin", label: "Admin" },
  { value: "other", label: "Other" },
];

const methodLabel = (value: string) =>
  METHOD_FILTERS.find((o) => o.value === value)?.label ?? value;

const reasonLabel = (value: string) => {
  if (value === "uncategorized") return "Uncategorized";
  return REASON_FILTERS.find((o) => o.value === value)?.label ?? value;
};

const TIME_RANGE_PRESETS: Array<{ value: TimeRange; label: string; helper: string }> = [
  { value: "week", label: "This week", helper: "Mon – today" },
  { value: "month", label: "Last 30 days", helper: "Rolling" },
  { value: "term", label: "This term", helper: "~12 weeks" },
  { value: "semester", label: "This semester", helper: "~20 weeks" },
  { value: "year", label: "Academic year", helper: "Aug – Jul" },
  { value: "custom", label: "Custom", helper: "Choose dates" },
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

function rangeFor(
  timeRange: TimeRange,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; bucket: "day" | "week" } {
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
    case "custom": {
      const fallbackStart = startOfDay(new Date(now));
      fallbackStart.setDate(fallbackStart.getDate() - 29);

      let start = customStart ? startOfDay(new Date(customStart)) : fallbackStart;
      let customEndDate = customEnd ? endOfDay(new Date(customEnd)) : end;

      if (Number.isNaN(start.getTime())) start = fallbackStart;
      if (Number.isNaN(customEndDate.getTime())) customEndDate = end;

      if (start > customEndDate) {
        const temp = start;
        start = customEndDate;
        customEndDate = temp;
      }

      const diffDays = Math.max(
        1,
        Math.round(
          (customEndDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      const bucket = diffDays <= 35 ? "day" : "week";
      return { start, end: customEndDate, bucket };
    }
  }
}

// ---- Label helpers ----
const fmtDay = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtWeekLabel = (d: Date) =>
  `Week of ${fmtDay(d)}`;

const formatRangeLabel = (start: Date, end: Date) => {
  const format = (value: Date) =>
    value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const startLabel = format(start);
  const endLabel = format(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

type PdfLine = {
  text: string;
  font?: "F1" | "F2";
  size?: number;
  marginTop?: number;
};

type AnalyticsSnapshot = {
  rangeLabel: string;
  generatedAt: Date;
  filters: string[];
  kpis: { totalContacts: number; studentsReached: number; avgPerWeek: number };
  methodData: Array<{ label: string; count: number }>;
  reasonData: Array<{ label: string; count: number }>;
  trendData: Array<{ label: string; count: number }>;
};

const escapePdfText = (input: string) => input.replace(/[\\()]/g, "\\$&");

const composePdf = (lines: PdfLine[]): Uint8Array => {
  const encoder = new TextEncoder();
  const header = encoder.encode("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  let length = header.length;
  const offsets: number[] = [];

  const pageHeight = 792;
  const margin = 64;
  const defaultGap = 18;
  let y = pageHeight - margin;
  const left = margin;

  let content = "";
  lines.forEach((line, index) => {
    if (index > 0) {
      const gap = line.marginTop ?? defaultGap;
      y -= gap;
    }
    const font = line.font ?? "F1";
    const size = line.size ?? 12;
    const safe = escapePdfText(line.text);
    content += `BT\n/${font} ${size} Tf\n1 0 0 1 ${left} ${y} Tm\n(${safe}) Tj\nET\n`;
  });

  const contentBytes = encoder.encode(content);
  const objects: string[] = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${contentBytes.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n",
  ];

  for (const obj of objects) {
    offsets.push(length);
    const bytes = encoder.encode(obj);
    chunks.push(bytes);
    length += bytes.length;
  }

  const startxref = length;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  xref += "trailer\n";
  xref += `<< /Size ${offsets.length + 1} /Root 1 0 R >>\n`;
  xref += `startxref\n${startxref}\n%%EOF`;

  const xrefBytes = encoder.encode(xref);
  chunks.push(xrefBytes);

  const totalLength = chunks.reduce((acc, arr) => acc + arr.length, 0);
  const pdfBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of chunks) {
    pdfBytes.set(arr, offset);
    offset += arr.length;
  }

  return pdfBytes;
};

const generateAnalyticsPdf = (snapshot: AnalyticsSnapshot): Uint8Array => {
  const lines: PdfLine[] = [
    { text: "EduConnect Analytics Summary", font: "F2", size: 20 },
    {
      text: `Generated on ${snapshot.generatedAt.toLocaleString()}`,
      marginTop: 26,
    },
    { text: `Time range: ${snapshot.rangeLabel}` },
  ];

  if (snapshot.filters.length) {
    lines.push({ text: `Active filters: ${snapshot.filters.join(", ")}` });
  } else {
    lines.push({ text: "Active filters: All methods and reasons" });
  }

  lines.push({ text: "Key metrics", font: "F2", size: 14, marginTop: 28 });
  lines.push({ text: `• Total contacts: ${snapshot.kpis.totalContacts}` });
  lines.push({ text: `• Students reached: ${snapshot.kpis.studentsReached}` });
  lines.push({ text: `• Average contacts per week: ${snapshot.kpis.avgPerWeek}` });

  lines.push({ text: "Method breakdown", font: "F2", size: 14, marginTop: 28 });
  if (snapshot.methodData.length === 0) {
    lines.push({ text: "• No communication logged in this range." });
  } else {
    snapshot.methodData
      .slice(0, 6)
      .forEach((item) =>
        lines.push({ text: `• ${item.label}: ${item.count} contact(s)` })
      );
  }

  lines.push({ text: "Reason breakdown", font: "F2", size: 14, marginTop: 24 });
  if (snapshot.reasonData.length === 0) {
    lines.push({ text: "• No reasons recorded in this range." });
  } else {
    snapshot.reasonData
      .slice(0, 6)
      .forEach((item) =>
        lines.push({ text: `• ${item.label}: ${item.count} contact(s)` })
      );
  }

  lines.push({ text: "Cadence overview", font: "F2", size: 14, marginTop: 24 });
  if (snapshot.trendData.length === 0) {
    lines.push({ text: "• No activity to plot." });
  } else {
    snapshot.trendData
      .slice(0, 8)
      .forEach((item) =>
        lines.push({ text: `• ${item.label}: ${item.count} contact(s)` })
      );
  }

  return composePdf(lines);
};

// ---- Component ----
export default function AnalyticsPage() {
  const [uid, setUid] = useState<string | null>(null);

  // filters
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [methodFilters, setMethodFilters] = useState<Method[]>([]);
  const [reasonFilters, setReasonFilters] = useState<Reason[]>([]);

  // data
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  useEffect(() => {
    if (timeRange !== "custom" || customStart || customEnd) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    setCustomStart(start.toISOString().slice(0, 10));
    setCustomEnd(end.toISOString().slice(0, 10));
  }, [timeRange, customStart, customEnd]);

  // fetch whenever filters change
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;
    const { start, end } = rangeFor(timeRange, customStart, customEnd);

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

        if (methodFilters.length)
          query = query.in("method", methodFilters as Method[]);
        if (reasonFilters.length)
          query = query.in("category", reasonFilters as Reason[]);

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
  }, [uid, timeRange, customStart, customEnd, methodFilters, reasonFilters]);

  // ---- Aggregations (pure in-memory) ----
  const range = useMemo(
    () => rangeFor(timeRange, customStart, customEnd),
    [timeRange, customStart, customEnd]
  );
  const rangeStartMs = range.start.getTime();
  const rangeEndMs = range.end.getTime();
  const rangeBucket = range.bucket;

  const { trendData, methodData, reasonData, kpis } = useMemo(() => {
    const list = rows ?? [];
    const start = new Date(rangeStartMs);
    const end = new Date(rangeEndMs);
    const bucket = rangeBucket;

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
  }, [rows, rangeStartMs, rangeEndMs, rangeBucket]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(new Date(rangeStartMs), new Date(rangeEndMs)),
    [rangeStartMs, rangeEndMs]
  );

  const filterLabels = useMemo(() => {
    const methodLabels = methodFilters.map((value) => `Method: ${methodLabel(value)}`);
    const reasonLabels = reasonFilters.map((value) => `Reason: ${reasonLabel(value)}`);
    return [...methodLabels, ...reasonLabels];
  }, [methodFilters, reasonFilters]);

  const toggleMethod = (value: Method) => {
    setMethodFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const toggleReason = (value: Reason) => {
    setReasonFilters((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const resetFilters = () => {
    setTimeRange("week");
    setCustomStart("");
    setCustomEnd("");
    setMethodFilters([]);
    setReasonFilters([]);
  };

  const handleDownloadPdf = () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      const pdfBytes = generateAnalyticsPdf({
        rangeLabel,
        generatedAt: new Date(),
        filters: filterLabels,
        kpis,
        methodData,
        reasonData,
        trendData,
      });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `educonnect-analytics-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setDownloadError("We couldn't prepare the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ---- UI ----
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-brand/10 bg-white/85 p-8 shadow-[0_45px_75px_-55px_rgba(15,23,42,0.7)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div>
              <h1 className="text-3xl font-semibold text-brand">Analytics</h1>
              <p className="mt-2 text-sm text-slate-600">
                Understand how you’re partnering with families. Explore your cadence, preferred methods,
                and the reasons you connect most.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
                {rangeLabel}
              </span>
              {filterLabels.length === 0 ? (
                <span className="rounded-full border border-brand/10 bg-white px-3 py-1 text-xs text-slate-500">
                  All methods & reasons
                </span>
              ) : (
                filterLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-medium text-brand"
                  >
                    {label}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="w-full md:w-auto"
            >
              {downloading ? "Preparing PDF…" : "Download filtered PDF"}
            </Button>
            <span className="text-xs text-slate-500">
              Exports KPIs, method & reason summaries, and cadence data.
            </span>
            {downloadError && (
              <span className="text-xs text-red-600">{downloadError}</span>
            )}
          </div>
        </div>
      </section>

      <Card className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand">Refine your analytics</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a timeframe and highlight the communication channels you want to focus on.
            </p>
          </div>
          <Button variant="secondary" onClick={resetFilters} className="w-full sm:w-auto">
            Reset filters
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Time range</div>
            <div className="flex flex-wrap gap-2">
              {TIME_RANGE_PRESETS.map((preset) => {
                const active = timeRange === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTimeRange(preset.value)}
                    className={`group flex flex-col rounded-2xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      active
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-brand/10 bg-white hover:border-brand/30"
                    }`}
                    aria-pressed={active}
                  >
                    <span className="text-sm font-semibold">{preset.label}</span>
                    <span className="text-xs text-slate-500">{preset.helper}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Methods</div>
            <div className="flex flex-wrap gap-2">
              {METHOD_FILTERS.map((item) => {
                const active = methodFilters.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleMethod(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      active
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-brand/15 bg-white text-slate-600 hover:border-brand/30"
                    }`}
                    aria-pressed={active}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Reasons</div>
            <div className="flex flex-wrap gap-2">
              {REASON_FILTERS.map((item) => {
                const active = reasonFilters.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleReason(item.value)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                      active
                        ? "border-accent bg-accent/20 text-accent-500"
                        : "border-brand/15 bg-white text-slate-600 hover:border-brand/30"
                    }`}
                    aria-pressed={active}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {timeRange === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start date
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-2 rounded-xl border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              End date
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-2 rounded-xl border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </label>
          </div>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-slate-500">Total contacts</div>
          <div className="mt-3 text-3xl font-semibold text-brand">{kpis.totalContacts}</div>
          <p className="mt-1 text-xs text-slate-500">All logged family touchpoints in the selected range.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Students reached</div>
          <div className="mt-3 text-3xl font-semibold text-brand">{kpis.studentsReached}</div>
          <p className="mt-1 text-xs text-slate-500">Unique students connected with their families.</p>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-slate-500">Average per week</div>
          <div className="mt-3 text-3xl font-semibold text-brand">{kpis.avgPerWeek}</div>
          <p className="mt-1 text-xs text-slate-500">Helps you gauge your communication rhythm.</p>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-brand">Communication cadence</h3>
            <span className="text-xs text-slate-500">Trend by {rangeBucket === "day" ? "day" : "week"}</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#64748B" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1F3C88" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-brand">By method</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#64748B" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#F4A261" stroke="#1F3C88" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 xl:col-span-3">
          <h3 className="text-lg font-semibold text-brand">By reason</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" stroke="#64748B" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#64748B" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1F3C88" stroke="#0C1538" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {loading && (
        <div className="rounded-2xl border border-brand/10 bg-white/70 p-4 text-sm text-slate-600">
          Loading analytics…
        </div>
      )}
      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      )}
      {!loading && rows && rows.length === 0 && (
        <div className="rounded-2xl border border-brand/10 bg-white/70 p-4 text-sm text-slate-600">
          No data in this range. Try widening your filters.
        </div>
      )}
    </div>
  );
}
