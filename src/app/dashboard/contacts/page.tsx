"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import NewContactForm, { ContactItem } from "@/components/NewContactForm";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";

// Row shape for contacts select
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

// Mini student
type StudentMini = { id: string; first_name: string; last_name: string };

export default function ContactsPage() {
  const [items, setItems] = useState<ContactItem[] | null>(null);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;

      const { data: contactsRaw } = await supabase
        .from("contacts")
        .select("id, subject, summary, occurred_at, created_at, method, category, student_id")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!contactsRaw) {
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
        map = new Map((students as unknown as StudentMini[] | null)?.map((s) => [s.id, s]) ?? []);
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
          <h1>Contact Logs</h1>
          <p className="muted mt-1">Log communications and keep a clear record.</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>New Contact</Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <div className="mt-2 text-sm text-slate-600">Loading…</div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No contacts yet."
              hint='Click "New Contact" to log one.'
            />
          ) : (
            <ul className="mt-2 divide-y divide-slate-200">
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
        </CardContent>
      </Card>

      {/* New Contact Modal */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Log a Contact">
        <NewContactForm onCreated={handleCreated} />
      </Modal>
    </div>
  );
}
