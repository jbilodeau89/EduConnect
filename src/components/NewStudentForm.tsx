"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { appChannel } from "@/lib/realtime";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  homeroom: string | null;
  email: string | null;
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
  const [homeroom, setHomeroom] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOwnerId(data.session?.user.id ?? null);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ownerId) return setError("Not authenticated.");
    if (!firstName.trim() || !lastName.trim()) {
      return setError("First and last name are required.");
    }

    setSaving(true);

    const payload = {
      owner_id: ownerId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      grade: grade.trim() || null,
      homeroom: homeroom.trim() || null,
    };

    const { data, error } = await supabase
      .from("students")
      .insert(payload)
      .select("id, first_name, last_name, email, grade, homeroom")
      .single();

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Broadcast to dashboard (increment Total Students)
    appChannel.send({
      type: "broadcast",
      event: "student:created",
      payload: { owner_id: ownerId, id: data!.id },
    });

    // Optimistic UI to the page list
    onCreated?.(data as StudentRow);

    // Reset form
    setFirst("");
    setLast("");
    setEmail("");
    setGrade("");
    setHomeroom("");
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
            Homeroom
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={homeroom}
            onChange={(e) => setHomeroom(e.target.value)}
            placeholder="e.g., 202"
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
