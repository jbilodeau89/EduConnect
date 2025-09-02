// src/app/demo/DemoData.ts
export type DemoStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade?: string | null;
  homeroom?: string | null;
  email?: string | null;
};

export type DemoContact = {
  id: string;
  student_id: string;
  subject: string | null;
  summary: string | null;
  occurred_at: string; // ISO
  created_at: string;  // ISO
  method: "email" | "phone" | "in_person" | "video" | "message" | "other";
  category: "academic" | "behavior" | "attendance" | "positive" | "admin" | "other" | null;
};

export const demoStudents: DemoStudent[] = [
  { id: "s1", first_name: "Ava", last_name: "Garcia", grade: "9", homeroom: "201", email: "ava@school.org" },
  { id: "s2", first_name: "Liam", last_name: "Nguyen", grade: "10", homeroom: "202", email: "liam@school.org" },
  { id: "s3", first_name: "Noah", last_name: "Johnson", grade: "11", homeroom: "301", email: "noah@school.org" },
  { id: "s4", first_name: "Emma", last_name: "Davis", grade: "12", homeroom: "302", email: "emma@school.org" },
];

export const demoContacts: DemoContact[] = [
  {
    id: "c1",
    student_id: "s1",
    subject: "Missing assignment",
    summary: "Followed up re: HW #5. Parent will review tonight.",
    occurred_at: "2025-05-22T14:10:00.000Z",
    created_at: "2025-05-22T14:12:00.000Z",
    method: "email",
    category: "academic",
  },
  {
    id: "c2",
    student_id: "s2",
    subject: "Expectations",
    summary: "Discussed classroom expectations, positive response.",
    occurred_at: "2025-05-21T19:30:00.000Z",
    created_at: "2025-05-21T19:31:00.000Z",
    method: "phone",
    category: "behavior",
  },
  {
    id: "c3",
    student_id: "s3",
    subject: "Presentation",
    summary: "Praised for strong project presentation.",
    occurred_at: "2025-05-21T12:00:00.000Z",
    created_at: "2025-05-21T12:05:00.000Z",
    method: "in_person",
    category: "positive",
  },
  {
    id: "c4",
    student_id: "s4",
    subject: "Absence note",
    summary: "Checked in after absence; provided missed materials.",
    occurred_at: "2025-05-20T15:20:00.000Z",
    created_at: "2025-05-20T15:25:00.000Z",
    method: "message",
    category: "attendance",
  },
];

export function fmt(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export const pretty = (s: string) => s.replace(/_/g, " ");
