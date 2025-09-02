// src/app/demo/contacts/page.tsx
"use client";

import { demoContacts, demoStudents, fmt, pretty } from "../DemoData";
import { useMemo, useState } from "react";

export default function DemoContactsPage() {
  const [studentQ, setStudentQ] = useState("");
  const [reasonQ, setReasonQ] = useState("");
  const [methodQ, setMethodQ] = useState("");

  const items = useMemo(() => {
    return demoContacts
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((c) => {
        const s = demoStudents.find((x) => x.id === c.student_id);
        const name = s ? `${s.last_name}, ${s.first_name}`.toLowerCase() : "";
        const matchesStudent = studentQ ? name.includes(studentQ.toLowerCase()) : true;
        const matchesReason = reasonQ ? (c.category ?? "").toLowerCase().includes(reasonQ.toLowerCase()) : true;
        const matchesMethod = methodQ ? c.method.toLowerCase().includes(methodQ.toLowerCase()) : true;
        return matchesStudent && matchesReason && matchesMethod;
      })
      .map((c) => {
        const s = demoStudents.find((x) => x.id === c.student_id) ?? null;
        return { ...c, studentName: s ? `${s.last_name}, ${s.first_name}` : "Unknown student" };
      });
  }, [studentQ, reasonQ, methodQ]);

  const gridCols = "grid grid-cols-[16rem_7rem_5rem_8rem_9rem_1fr] gap-x-3";
  const pill = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Contact Logs (Demo)</h1>
          <p className="mt-1 text-sm muted">Browse and filter. Logging is disabled in demo.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-brand opacity-60 cursor-not-allowed" title="Demo mode: disabled">
            New Contact
          </button>
          <button className="btn opacity-60 cursor-not-allowed" title="Demo mode: disabled">
            Download CSV
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="input"
            placeholder="Filter by student name…"
            value={studentQ}
            onChange={(e) => setStudentQ(e.target.value)}
          />
          <input
            className="input"
            placeholder="Filter by reason…"
            value={reasonQ}
            onChange={(e) => setReasonQ(e.target.value)}
          />
          <input
            className="input"
            placeholder="Filter by method…"
            value={methodQ}
            onChange={(e) => setMethodQ(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <section className="card p-6">
        {/* Header row */}
        <div className={`hidden md:${gridCols} text-xs uppercase tracking-wide muted pb-2 border-b border-black/10`}>
          <div>Student</div>
          <div>Date</div>
          <div>Time</div>
          <div>Method</div>
          <div>Reason</div>
          <div>Message</div>
        </div>

        <ul className="divide-y divide-black/10">
          {items.map((c) => {
            const { date, time } = fmt(c.occurred_at);
            const methodLabel = pretty(c.method);
            const reasonLabel = c.category ? pretty(c.category) : "—";
            const message = c.subject || c.summary || "";
            return (
              <li key={c.id} className="py-2">
                <div className={`${gridCols} items-baseline text-sm`}>
                  <span className="font-medium text-slate-900 truncate">{c.studentName}</span>
                  <span className="muted tabular-nums">{date}</span>
                  <span className="muted tabular-nums">{time}</span>
                  <span>
                    <span className={`${pill} bg-ivory text-brand-900 border-brand/20 capitalize`}>{methodLabel}</span>
                  </span>
                  <span>
                    <span className={`${pill} bg-ivory text-brand-900 border-brand/20 capitalize`}>{reasonLabel}</span>
                  </span>
                  <span className="truncate text-slate-900">{message}</span>
                </div>
              </li>
            );
          })}
          {items.length === 0 && <li className="py-4 text-sm muted">No matches for current filters.</li>}
        </ul>
      </section>
    </div>
  );
}
