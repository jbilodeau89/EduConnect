"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import NewContactForm from "@/components/NewContactForm";
import Modal from "@/components/Modal";
import { Download } from "lucide-react";

// Shape returned from DB
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

// What we render (includes student name + optional id for precise exports)
type DisplayContact = {
  id: string;
  occurred_at: string;
  created_at: string;
  method: string;
  category: string | null;
  subject: string | null;
  summary: string | null;
  student: { first_name: string; last_name: string } | null;
  studentId?: string | null;
};

export default function ContactsPage() {
  const [items, setItems] = useState<DisplayContact[] | null>(null);
  const [openNew, setOpenNew] = useState(false);

  // filters
  const [qStudent, setQStudent] = useState("");
  const [qReason, setQReason] = useState("");
  const [qMethod, setQMethod] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;

      const { data: contactsRaw } = await supabase
        .from("contacts")
        .select(
          "id, subject, summary, occurred_at, created_at, method, category, student_id"
        )
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!contactsRaw || contactsRaw.length === 0) {
        if (mounted) setItems([]);
        return;
      }

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

      const result: DisplayContact[] = contacts.map((c) => ({
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
        studentId: c.student_id,
      }));

      if (mounted) setItems(result);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // When a new contact is created via modal, optimistically prepend
  const handleCreated = (item: {
    id: string;
    subject: string | null;
    summary: string | null;
    occurred_at: string;
    method: string;
    category: string | null;
    student: { first_name: string; last_name: string } | null;
  }) => {
    const display: DisplayContact = {
      ...item,
      created_at: new Date().toISOString(),
      studentId: undefined, // we don’t have the id from the form callback; name is still usable in filters/exports
    };
    setItems((prev) => [display, ...(prev ?? [])]);
    setOpenNew(false);
  };

  // Formatting helpers
  const fmt = (iso: string) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  };
  const pretty = (s: string) => s.replace(/_/g, " ");

  // Shared grid template so header + rows align perfectly
  const gridCols =
    "grid grid-cols-[16rem_7rem_5rem_8rem_9rem_1fr_2rem] gap-x-3"; // +1 col for row action
  const pill =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

  // Derived: filtered rows
  const filtered = useMemo(() => {
    if (!items) return null;

    const nameQ = qStudent.trim().toLowerCase();
    const reasonQ = qReason.trim().toLowerCase();
    const methodQ = qMethod.trim().toLowerCase();

    return items.filter((c) => {
      // name match (last, first)
      const name = c.student
        ? `${c.student.last_name}, ${c.student.first_name}`.toLowerCase()
        : "";
      if (nameQ && !name.includes(nameQ)) return false;

      // reason/category exact-ish (allow partial)
      const reason = (c.category ?? "").toLowerCase();
      if (reasonQ && !reason.includes(reasonQ)) return false;

      // method exact-ish (allow partial)
      const m = (c.method ?? "").toLowerCase();
      if (methodQ && !m.includes(methodQ)) return false;

      return true;
    });
  }, [items, qStudent, qReason, qMethod]);

  // CSV helpers
  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const toCSV = (rows: DisplayContact[]) => {
    const header = [
      "student_name",
      "date",
      "time",
      "occurred_at_iso",
      "method",
      "reason",
      "subject",
      "summary",
    ].join(",");

    const lines = rows.map((r) => {
      const name = r.student ? `${r.student.last_name}, ${r.student.first_name}` : "";
      const { date, time } = fmt(r.occurred_at);
      const cols = [
        name,
        date,
        time,
        r.occurred_at,
        r.method,
        r.category ?? "",
        r.subject ?? "",
        r.summary ?? "",
      ].map((x) => csvEscape(String(x)));
      return cols.join(",");
    });

    return [header, ...lines].join("\n");
  };

  const downloadBlob = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export currently filtered rows
  const onDownloadFiltered = () => {
    if (!filtered || filtered.length === 0) return;
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const parts = [];
    if (qStudent.trim()) parts.push(`name-${qStudent.trim().replace(/\s+/g, "_")}`);
    if (qReason.trim()) parts.push(`reason-${qReason.trim().replace(/\s+/g, "_")}`);
    if (qMethod.trim()) parts.push(`method-${qMethod.trim().replace(/\s+/g, "_")}`);
    const suffix = parts.length ? `_${parts.join("_")}` : "";
    const csv = toCSV(filtered);
    downloadBlob(csv, `contacts${suffix}_${ts}.csv`);
  };

  // Export all rows for a specific student (by id if we have it; else by exact name)
  const onDownloadForStudent = (target: DisplayContact) => {
    if (!items || items.length === 0) return;
    let rows: DisplayContact[] = [];

    if (target.studentId) {
      rows = items.filter((r) => r.studentId === target.studentId);
    } else if (target.student) {
      const exact = `${target.student.last_name}, ${target.student.first_name}`;
      rows = items.filter((r) => {
        const name = r.student ? `${r.student.last_name}, ${r.student.first_name}` : "";
        return name === exact;
      });
    }

    if (rows.length === 0) return;

    const safeName = target.student
      ? `${target.student.last_name}_${target.student.first_name}`
      : "unknown";
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const csv = toCSV(rows);
    downloadBlob(csv, `contacts_${safeName}_${ts}.csv`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Contact Logs</h1>
          <p className="mt-1 text-sm muted">
            Filter and export logs by student, method, or reason.
          </p>
        </div>
        <button onClick={() => setOpenNew(true)} className="btn btn-brand">
          New Contact
        </button>
      </header>

      {/* Filters + Download */}
      <section className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_14rem_14rem_auto] items-end">
          <div>
            <label className="label">Student</label>
            <input
              className="input mt-1"
              placeholder="Search name…"
              value={qStudent}
              onChange={(e) => setQStudent(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Reason</label>
            <input
              className="input mt-1"
              placeholder="e.g., academic, behavior…"
              value={qReason}
              onChange={(e) => setQReason(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Method</label>
            <input
              className="input mt-1"
              placeholder="e.g., email, phone…"
              value={qMethod}
              onChange={(e) => setQMethod(e.target.value)}
            />
          </div>

          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setQStudent("");
                setQReason("");
                setQMethod("");
              }}
              className="btn"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={onDownloadFiltered}
              disabled={!filtered || filtered.length === 0}
              className="btn btn-brand"
              title={filtered && filtered.length ? `Download ${filtered.length} row(s)` : "Nothing to download"}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">Recent</h2>

        {items === null ? (
          <div className="mt-6 text-sm muted">Loading…</div>
        ) : filtered && filtered.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-black/10 p-8 text-center text-sm muted">
            No matching contacts. Adjust filters or log a new contact.
          </div>
        ) : (
          <div className="mt-4">
            {/* Header row (md+) */}
            <div
              className={`hidden md:${gridCols} text-xs uppercase tracking-wide muted pb-2 border-b border-black/10`}
            >
              <div>Student</div>
              <div>Date</div>
              <div>Time</div>
              <div>Method</div>
              <div>Reason</div>
              <div>Message</div>
              <div className="text-right pr-1">CSV</div>
            </div>

            <ul className="divide-y divide-black/10">
              {(filtered ?? items ?? []).map((c) => {
                const { date, time } = fmt(c.occurred_at);
                const name = c.student
                  ? `${c.student.last_name}, ${c.student.first_name}`
                  : "Unknown student";
                const methodLabel = pretty(c.method);
                const reasonLabel = c.category ? pretty(c.category) : "—";
                const message = c.subject || c.summary || "";

                return (
                  <li key={c.id} className="py-2">
                    {/* Row grid matches header template for perfect alignment */}
                    <div className={`${gridCols} items-baseline text-sm`}>
                      <span className="font-medium text-slate-900 truncate">{name}</span>
                      <span className="muted tabular-nums">{date}</span>
                      <span className="muted tabular-nums">{time}</span>

                      {/* Method pill — minority color (Ivory) background with Plum text */}
                      <span>
                        <span className={`${pill} bg-ivory text-brand-900 border-brand/20 capitalize`}>
                          {methodLabel}
                        </span>
                      </span>

                      {/* Reason pill */}
                      <span>
                        {c.category ? (
                          <span className={`${pill} bg-ivory text-brand-900 border-brand/20 capitalize`}>
                            {reasonLabel}
                          </span>
                        ) : (
                          <span className={`${pill} bg-slate-100 text-slate-600 border-transparent`}>—</span>
                        )}
                      </span>

                      {/* Message (truncated) */}
                      <span className="truncate text-slate-900">{message}</span>

                      {/* Per-student CSV */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
                          aria-label="Download CSV for this student"
                          title="Download CSV for this student"
                          onClick={() => onDownloadForStudent(c)}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* New Contact Modal */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Log a Contact">
        <NewContactForm onCreated={handleCreated} />
      </Modal>
    </div>
  );
}
