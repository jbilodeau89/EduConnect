"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NewStudentForm, { StudentRow } from "@/components/NewStudentForm";
import BulkAddStudents from "@/components/BulkAddStudents";
import Modal from "@/components/Modal";

export default function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade, homeroom, email")
        .eq("owner_id", uid)
        .order("last_name", { ascending: true });

      if (mounted) setRows(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (row: StudentRow) => {
    setRows((prev) => {
      const next = [row, ...(prev ?? [])];
      return next.sort((a, b) => a.last_name.localeCompare(b.last_name));
    });
    setOpenAdd(false);
  };

  const handleCreatedMany = (newRows: StudentRow[]) => {
    setRows((prev) => {
      const next = [...(prev ?? []), ...newRows];
      return next.sort((a, b) => a.last_name.localeCompare(b.last_name));
    });
    setOpenBulk(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add students and keep key info handy for faster logging.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenBulk(true)}
            className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-slate-800 text-sm font-medium hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Import CSV
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Add Student
          </button>
        </div>
      </header>

      {/* List */}
      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Your Students</h2>
        {rows === null ? (
          <div className="mt-6 text-sm text-slate-600">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-600">
            No students yet. Click <span className="font-medium">Add Student</span> or{" "}
            <span className="font-medium">Import CSV</span>.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {rows.map((s) => (
              <li key={s.id} className="py-3">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">
                    {s.last_name}, {s.first_name}
                  </div>
                  <div className="text-slate-600">
                    {s.grade ? `Grade ${s.grade}` : "—"} · {s.homeroom || "—"} {s.email ? `· ${s.email}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Student Modal */}
      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add a Student">
        <NewStudentForm onCreated={handleCreated} />
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={openBulk} onClose={() => setOpenBulk(false)} title="Bulk Add Students">
        <BulkAddStudents onCreatedMany={handleCreatedMany} />
      </Modal>
    </div>
  );
}
