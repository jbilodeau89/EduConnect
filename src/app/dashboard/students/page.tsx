"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import NewStudentForm, { type StudentRow } from "@/components/NewStudentForm";
import BulkAddStudents from "@/components/BulkAddStudents";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";

export default function StudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade, homeroom, email")
        .eq("owner_id", uid)
        .order("last_name", { ascending: true });

      if (mounted) setRows((data as unknown as StudentRow[]) ?? []);
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
          <h1>Students</h1>
          <p className="muted mt-1">Add students and keep key info handy for faster logging.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenBulk(true)}>
            Import CSV
          </Button>
          <Button onClick={() => setOpenAdd(true)}>Add Student</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Your Students</CardTitle>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <div className="mt-2 text-sm text-slate-600">Loading…</div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No students yet."
              hint='Use "Add Student" or "Import CSV" to get started.'
            />
          ) : (
            <ul className="mt-2 divide-y divide-slate-200">
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
        </CardContent>
      </Card>

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
