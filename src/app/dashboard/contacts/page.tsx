"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import NewContactForm, { ContactItem } from "@/components/NewContactForm";
import Modal from "@/components/Modal";

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

export default function ContactsPage() {
  const [items, setItems] = useState<ContactItem[] | null>(null);
  const [openNew, setOpenNew] = useState(false);

  // Filters
  const [studentFilter, setStudentFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

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
        .limit(50);

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

      const result: ContactItem[] = contacts.map((c) => ({
        id: c.id,
        subject: c.subject,
        summary: c.summary,
        occurred_at: c.occurred_at,
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

      if (mounted) setItems(result);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (item: ContactItem) => {
    setItems((prev) => [item, ...(prev ?? [])]);
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
    "grid grid-cols-[16rem_7rem_5rem_8rem_9rem_1fr] gap-x-3"; // Student | Date | Time | Method | Reason | Message
  const pill =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

  // Derived filtered list
  const filtered = useMemo(() => {
    if (!items) return null;
    const s = studentFilter.trim().toLowerCase();
    const r = reasonFilter.trim().toLowerCase();
    const m = methodFilter.trim().toLowerCase();

    return items.filter((it) => {
      const studentName = it.student
        ? `${it.student.last_name}, ${it.student.first_name}`.toLowerCase()
        : "";
      const reason = it.category?.toLowerCase() ?? "";
      const method = it.method?.toLowerCase() ?? "";
      const okStudent = s ? studentName.includes(s) : true;
      const okReason = r ? reason.includes(r) : true;
      const okMethod = m ? method === m : true; // exact match for method options
      return okStudent && okReason && okMethod;
    });
  }, [items, studentFilter, reasonFilter, methodFilter]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Contact Logs</h1>
          <p className="mt-1 text-sm muted">Track your contact information here</p>
        </div>
        <button onClick={() => setOpenNew(true)} className="btn btn-brand">
          New Contact
        </button>
      </header>

      <section className="card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Recent</h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              placeholder="Filter by student…"
              className="w-full sm:w-48 rounded-lg border border-black/10 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
            />
            <input
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              placeholder="Filter by reason…"
              className="w-full sm:w-48 rounded-lg border border-black/10 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full sm:w-44 rounded-lg border border-black/10 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
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
        </div>

        {filtered === null ? (
          <div className="mt-6 text-sm muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-black/10 p-8 text-center text-sm muted">
            No contacts match your filters.
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
            </div>

            <ul className="divide-y divide-black/10">
              {filtered.map((c) => {
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

                      {/* Reason pill — if missing, show muted pill to keep alignment consistent */}
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
