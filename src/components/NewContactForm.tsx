"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";

type StudentRow = { id: string; first_name: string; last_name: string };

export type ContactItem = {
  id: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  method: string;
  category: string | null;
  student: { first_name: string; last_name: string } | null;
};

// Local datetime string for <input type="datetime-local">
function localDateTimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Shape of the row we SELECT back after insert
type ContactInsertResult = {
  id: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  created_at: string;
  method: string;
  category: string | null;
  student_id: string;
};

export default function NewContactForm({
  onCreated,
}: {
  onCreated?: (item: ContactItem) => void;
}) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [studentId, setStudentId] = useState("");
  const [method, setMethod] = useState("email");
  const [category, setCategory] = useState("academic");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState<string>(() =>
    localDateTimeInputValue(new Date())
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session + students
  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id ?? null;
        setOwnerId(uid);
        if (!uid) {
          setStudents([]);
          return;
        }

        const { data: rows, error: qErr } = await supabase
          .from("students")
          .select("id, first_name, last_name")
          .eq("owner_id", uid)
          .order("last_name", { ascending: true });

        if (qErr) throw qErr;

        const studentsRows = (rows ?? []) as unknown as StudentRow[];
        setStudents(studentsRows);
      } catch {
        setStudents([]);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ownerId) {
      setError("Not authenticated.");
      return;
    }
    if (!studentId) {
      setError("Please choose a student.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();

      const payload = {
        owner_id: ownerId,
        student_id: studentId,
        method,
        category,
        subject: subject.trim() || null,
        summary: summary.trim() || null,
        occurred_at: new Date(occurredAt).toISOString(), // store UTC
      };

            const { data, error: insErr } = await supabase
        .from("contacts")
        // TS: without generated types, insert expects `never`. Cast just for this call.
        .insert(payload as never)
        .select(
          "id, subject, summary, occurred_at, created_at, method, category, student_id"
        )
        .single();

      if (insErr) throw insErr;
      if (!data) throw new Error("Insert failed");

      const created = data as unknown as ContactInsertResult;

      const s = students.find((x) => x.id === created.student_id) ?? null;

      // 🔔 Broadcast to dashboard with created_at for correct ordering
      appChannel?.send?.({
        type: "broadcast",
        event: "contact:created",
        payload: {
          owner_id: ownerId,
          id: created.id,
          subject: created.subject,
          summary: created.summary,
          occurred_at: created.occurred_at,
          created_at: created.created_at, // for sorting recent activity
          method: created.method,
          category: created.category,
          student: s ? { first_name: s.first_name, last_name: s.last_name } : null,
        },
      });

      // Optimistic UI for the contacts page list
      onCreated?.({
        id: created.id,
        subject: created.subject,
        summary: created.summary,
        occurred_at: created.occurred_at,
        method: created.method,
        category: created.category,
        student: s ? { first_name: s.first_name, last_name: s.last_name } : null,
      });

      // Reset form
      setStudentId("");
      setMethod("email");
      setCategory("academic");
      setSubject("");
      setSummary("");
      setOccurredAt(localDateTimeInputValue(new Date()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to log contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Student
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.last_name}, {s.first_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Method
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="in_person">In person</option>
              <option value="video">Video</option>
              <option value="message">Message</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="academic">Academic</option>
              <option value="behavior">Behavior</option>
              <option value="attendance">Attendance</option>
              <option value="positive">Positive</option>
              <option value="admin">Admin</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Subject (optional)
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject or topic"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Occurred at
          </label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Summary (optional)
        </label>
        <textarea
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Key points from the conversation…"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-70"
        >
          {saving ? "Logging…" : "Log Contact"}
        </button>
      </div>
    </form>
  );
}
