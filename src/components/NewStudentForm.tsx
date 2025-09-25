"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  homeroom: string | null; // DB field; shown as "Class" in UI
  email: string | null;
};

// Insert payload we send to Supabase
type StudentInsertRow = {
  owner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: string | null;
  homeroom: string | null; // <-- still homeroom in DB
};

export default function NewStudentForm({
  onCreated,
}: {
  onCreated?: (row: StudentRow) => void;
}) {
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [homeroom, setHomeroom] = useState(""); // UI label shows "Class"

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setOwnerId(data.session?.user.id ?? null);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ownerId) {
      setError("Not authenticated.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();

      const payload: StudentInsertRow = {
        owner_id: ownerId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        grade: grade.trim() || null,
        homeroom: homeroom.trim() || null, // still writes to DB homeroom
      };

      const { data, error: insErr } = await supabase
        .from("students")
        // Without generated DB types, Supabase generics may infer `never`. Cast only here.
        .insert(payload as never)
        .select("id, first_name, last_name, email, grade, homeroom")
        .single();

      if (insErr) throw insErr;
      if (!data) throw new Error("Insert failed");

      const row = data as unknown as StudentRow;

      // Broadcast to dashboard (increment Total Students)
      appChannel?.send?.({
        type: "broadcast",
        event: "student:created",
        payload: { owner_id: ownerId, id: row.id },
      });

      // Optimistic UI to the page list
      onCreated?.(row);

      // Reset form
      setFirst("");
      setLast("");
      setEmail("");
      setGrade("");
      setHomeroom("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add student.");
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
            First name
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={firstName}
            onChange={(e) => setFirst(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Last name
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={lastName}
            onChange={(e) => setLast(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email (optional)
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.org"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Grade
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="e.g., 9"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Class
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={homeroom}
            onChange={(e) => setHomeroom(e.target.value)}
            placeholder="e.g., Algebra I"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-70"
        >
          {saving ? "Adding…" : "Add Student"}
        </button>
      </div>
    </form>
  );
}
