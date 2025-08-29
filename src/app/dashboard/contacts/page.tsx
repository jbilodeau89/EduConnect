"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NewContactForm, { ContactItem } from "@/components/NewContactForm";
import Modal from "@/components/Modal";

export default function ContactsPage() {
  const [items, setItems] = useState<ContactItem[] | null>(null);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;

      // 👉 Order by created_at so newest logged entry is first
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!contacts) {
        if (mounted) setItems([]);
        return;
      }

      const studentIds = Array.from(new Set(contacts.map((c) => c.student_id)));
      const { data: students } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .in("id", studentIds);

      const map = new Map(students?.map((s) => [s.id, s]) ?? []);
      const result: ContactItem[] = contacts.map((c) => ({
        id: c.id,
        subject: c.subject,
        summary: c.summary,
        occurred_at: c.occurred_at,
        method: c.method,
        category: c.category,
        student: map.get(c.student_id)
          ? { first_name: map.get(c.student_id)!.first_name, last_name: map.get(c.student_id)!.last_name }
          : null,
      }));

      if (mounted) setItems(result);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreated = (item: ContactItem) => {
    // Prepend new item so it shows immediately at the top
    setItems((prev) => [item, ...(prev ?? [])]);
    setOpenNew(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Contact Logs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Log communications and keep a clear record.
          </p>
        </div>
        <button
          onClick={() => setOpenNew(true)}
          className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          New Contact
        </button>
      </header>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Recent</h2>
        {items === null ? (
          <div className="mt-6 text-sm text-slate-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-600">
            No contacts yet. Click <span className="font-medium">New Contact</span> to log one.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {items.map((c) => (
              <li key={c.id} className="py-3">
                <div className="text-sm">
                  <div className="font-medium text-slate-900">
                    {c.student ? `${c.student.last_name}, ${c.student.first_name}` : "Unknown student"}
                  </div>
                  <div className="text-slate-600">
                    {new Date(c.occurred_at).toLocaleString()} · {c.method.replace("_", " ")}
                    {c.category ? ` · ${c.category}` : ""}
                  </div>
                  {c.subject && <div className="text-slate-900 mt-1">{c.subject}</div>}
                  {c.summary && <div className="text-slate-700 mt-1">{c.summary}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* New Contact Modal */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Log a Contact">
        <NewContactForm onCreated={handleCreated} />
      </Modal>
    </div>
  );
}
