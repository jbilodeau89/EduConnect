// src/app/demo/students/page.tsx
"use client";

import { demoStudents } from "../DemoData";
import { useMemo, useState } from "react";

export default function DemoStudentsPage() {
  const [q, setQ] = useState("");
  const [gradeQ, setGradeQ] = useState("");

  const rows = useMemo(() => {
    return demoStudents
      .filter((s) => {
        const name = `${s.last_name}, ${s.first_name}`.toLowerCase();
        const matchesName = q ? name.includes(q.toLowerCase()) : true;
        const matchesGrade = gradeQ ? (s.grade ?? "").toLowerCase() === gradeQ.toLowerCase() : true;
        return matchesName && matchesGrade;
      })
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [q, gradeQ]);

  const grades = Array.from(new Set(demoStudents.map((s) => s.grade).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Students (Demo)</h1>
          <p className="mt-1 text-sm muted">Browse and filter. Adding and deleting are disabled in demo.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn opacity-60 cursor-not-allowed" title="Demo mode: disabled">
            Import CSV
          </button>
          <button className="btn btn-brand opacity-60 cursor-not-allowed" title="Demo mode: disabled">
            Add Student
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            className="input"
            placeholder="Search by name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input" value={gradeQ} onChange={(e) => setGradeQ(e.target.value)}>
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>

          <button className="btn opacity-60 cursor-not-allowed ml-auto" title="Demo mode: disabled">
            Delete Selected
          </button>
        </div>
      </div>

      {/* Table */}
      <section className="card p-6">
        <div className="hidden md:grid grid-cols-[1.2rem_16rem_10rem_8rem_1fr] gap-x-3 text-xs uppercase tracking-wide muted pb-2 border-b border-black/10">
          <div />
          <div>Name</div>
          <div>Email</div>
          <div>Grade</div>
          <div>Homeroom</div>
        </div>

        <ul className="divide-y divide-black/10">
          {rows.map((s) => (
            <li key={s.id} className="py-2">
              <div className="grid grid-cols-[1.2rem_16rem_10rem_8rem_1fr] gap-x-3 items-baseline text-sm">
                {/* “Selection” box mimic (disabled) */}
                <input type="checkbox" disabled className="h-4 w-4 opacity-50" />
                <span className="font-medium text-slate-900 truncate">
                  {s.last_name}, {s.first_name}
                </span>
                <span className="muted truncate">{s.email ?? "—"}</span>
                <span className="muted">{s.grade ? `Grade ${s.grade}` : "—"}</span>
                <span className="muted">{s.homeroom ?? "—"}</span>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="py-4 text-sm muted">No matches for current filters.</li>}
        </ul>
      </section>
    </div>
  );
}
