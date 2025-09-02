// src/app/demo/page.tsx
"use client";

import { demoContacts, demoStudents, fmt, pretty } from "./DemoData";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function DemoDashboard() {
  // Stats from demo data
  const totalStudents = demoStudents.length;
  const totalContacts = demoContacts.length;
  const contactsThisWeek = demoContacts.filter((c) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return new Date(c.occurred_at) >= monday;
  }).length;

  // Filters
  const [studentQ, setStudentQ] = useState("");
  const [reasonQ, setReasonQ] = useState("");
  const [methodQ, setMethodQ] = useState("");

  const recent = useMemo(() => {
    const contacts = [...demoContacts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return contacts
      .slice(0, 12)
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

  // Shared grid
  const gridCols = "grid grid-cols-[16rem_7rem_5rem_8rem_9rem_1fr] gap-x-3";
  const pill = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

  return (
    <div className="space-y-6">
      {/* Banner + CTA (disabled) */}
      <div className="rounded-2xl overflow-hidden ring-1 ring-black/10 bg-white shadow-sm">
        <div className="bg-brand text-white px-6 py-4 flex items-center justify-between">
          <div className="font-semibold">Welcome, Teacher</div>
          <span className="text-xs opacity-90">Demo mode: read-only</span>
        </div>

        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Dashboard (Demo)</h1>
            <p className="mt-1 text-sm muted">
              Explore the interface. Writing is disabled.
            </p>
          </div>
          <button className="btn btn-brand opacity-60 cursor-not-allowed" title="Demo mode: disabled">
            New Contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <div className="text-sm muted">Total Students</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{totalStudents}</div>
          <div className="mt-4 h-1 rounded-full bg-brand-700" />
        </div>
        <div className="card p-6">
          <div className="text-sm muted">Total Contacts</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{totalContacts}</div>
          <div className="mt-4 h-1 rounded-full bg-brand-700" />
        </div>
        <div className="card p-6">
          <div className="text-sm muted">Contacts This Week</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900">{contactsThisWeek}</div>
          <div className="mt-4 h-1 rounded-full bg-ivory" />
        </div>
      </section>

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

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between p-6 pb-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <Link href="/demo/contacts" className="text-sm underline">
            See all contacts
          </Link>
        </div>
        <div className="h-1 bg-gradient-to-r from-brand-700 to-ivory" />
        <div className="p-6">
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
            {recent.map((c) => {
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
            {recent.length === 0 && (
              <li className="py-4 text-sm muted">No matches for current filters.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
