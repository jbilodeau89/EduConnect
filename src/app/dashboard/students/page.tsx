"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import NewStudentForm, { StudentRow } from "@/components/NewStudentForm";
import BulkAddStudents from "@/components/BulkAddStudents";
import Modal from "@/components/Modal";

export default function StudentsPage() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentRow[] | null>(null); // full dataset for this teacher
  const [openAdd, setOpenAdd] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);

  // Filters
  const [q, setQ] = useState(""); // search: name/email
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [homeroomFilter, setHomeroomFilter] = useState<string>(""); // stays named "homeroom" to avoid ripple

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      setOwnerId(uid);
      if (!uid) return;

      const { data: list } = await supabase
        .from("students")
        .select("id, first_name, last_name, grade, homeroom, email")
        .eq("owner_id", uid)
        .order("last_name", { ascending: true });

      if (mounted) setRows((list as StudentRow[]) ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Options for filters (derived from full dataset)
  const uniqueGrades = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.grade && r.grade.trim()) s.add(r.grade.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  const uniqueHomerooms = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.homeroom && r.homeroom.trim()) s.add(r.homeroom.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  // Filtered/visible rows
  const filtered = useMemo(() => {
    const list = rows ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((r) => {
      if (gradeFilter && (r.grade ?? "") !== gradeFilter) return false;
      if (homeroomFilter && (r.homeroom ?? "") !== homeroomFilter) return false;
      if (!needle) return true;
      const name = `${r.last_name ?? ""}, ${r.first_name ?? ""}`.toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [rows, q, gradeFilter, homeroomFilter]);

  // Keep selection in sync with visible set (drop hidden selections)
  useEffect(() => {
    setSelected((prev) => {
      if (filtered.length === 0) return new Set();
      const visibleIds = new Set(filtered.map((r) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered]);

  // Grid + pills
  const gridCols = "grid grid-cols-[1.75rem_20rem_10rem_12rem_1fr] gap-x-3";
  const pill =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";
  const gradePill = `${pill} bg-ivory text-brand-900 border-brand/20`;
  const emptyPill = `${pill} bg-slate-100 text-slate-600 border-transparent`;

  const allVisibleIds = filtered.map((r) => r.id);
  const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDeleteSelected = async () => {
    if (!ownerId || selected.size === 0) return;
    setConfirmError(null);
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const supabase = getSupabase();
      const { error } = await supabase
        .from("students")
        .delete()
        .in("id", ids)
        .eq("owner_id", ownerId);
      if (error) throw error;

      // Remove from local state
      setRows((prev) => (prev ?? []).filter((r) => !selected.has(r.id)));
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Delete failed. If students are referenced by contact logs, remove those logs first.";
      setConfirmError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreated = (row: StudentRow) => {
    setRows((prev) => {
      const next = [row, ...(prev ?? [])];
      return next.sort((a, b) =>
        (a.last_name || "").localeCompare(b.last_name || "", undefined, { sensitivity: "base" })
      );
    });
    setOpenAdd(false);
  };

  const handleCreatedMany = (newRows: StudentRow[]) => {
    setRows((prev) => {
      const next = [...(prev ?? []), ...newRows];
      return next.sort((a, b) =>
        (a.last_name || "").localeCompare(b.last_name || "", undefined, { sensitivity: "base" })
      );
    });
    setOpenBulk(false);
  };

  const clearFilters = () => {
    setQ("");
    setGradeFilter("");
    setHomeroomFilter("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Students</h1>
          <p className="mt-1 text-sm muted">
            One-line view with filter and bulk delete.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpenBulk(true)} className="btn">
            Import CSV
          </button>
          <button onClick={() => setOpenAdd(true)} className="btn btn-brand">
            Add Student
          </button>
        </div>
      </header>

      {/* Filters + actions */}
      <section className="card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide muted mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name or email…"
                className="rounded-lg border px-3 py-2 text-sm w-64"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide muted mb-1">Grade</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm w-40"
              >
                <option value="">All grades</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide muted mb-1">Class</label>
              <select
                value={homeroomFilter}
                onChange={(e) => setHomeroomFilter(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm w-44"
              >
                <option value="">All classes</option>
                {uniqueHomerooms.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={clearFilters} className="btn ml-0 sm:ml-2">
              Clear
            </button>
          </div>

          {/* Bulk delete */}
          <div className="flex items-center gap-2">
            <button
              disabled={selected.size === 0}
              onClick={() => setConfirmOpen(true)}
              className={`btn ${selected.size ? "btn-danger" : "opacity-60 cursor-not-allowed"}`}
              title={selected.size ? `Delete ${selected.size} selected` : "Select rows to delete"}
            >
              Delete{selected.size ? ` (${selected.size})` : ""}
            </button>
          </div>
        </div>

        {/* Table header */}
        <div className="mt-4 hidden md:grid text-xs uppercase tracking-wide muted pb-2 border-b border-black/10">
          <div className={gridCols}>
            <div>
              <input
                aria-label="Select all visible"
                type="checkbox"
                className="h-4 w-4 align-middle"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
              />
            </div>
            <div>Name</div>
            <div>Grade</div>
            <div>Class</div>
            <div>Email</div>
          </div>
        </div>

        {/* Rows */}
        {rows === null ? (
          <div className="mt-6 text-sm muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-black/10 p-8 text-center text-sm muted">
            No students match these filters.
          </div>
        ) : (
          <ul className="divide-y divide-black/10 mt-2">
            {filtered.map((s) => {
              const id = s.id;
              const isChecked = selected.has(id);
              return (
                <li key={id} className="py-2">
                  <div className={`${gridCols} items-baseline text-sm`}>
                    {/* select */}
                    <div>
                      <input
                        aria-label={`Select ${s.last_name}, ${s.first_name}`}
                        type="checkbox"
                        className="h-4 w-4 align-middle"
                        checked={isChecked}
                        onChange={() => toggleOne(id)}
                      />
                    </div>

                    {/* Name */}
                    <span className="font-medium text-slate-900 truncate">
                      {(s.last_name || "—") + ", " + (s.first_name || "—")}
                    </span>

                    {/* Grade pill */}
                    <span>
                      {s.grade ? (
                        <span className={gradePill}>Grade {s.grade}</span>
                      ) : (
                        <span className={emptyPill}>—</span>
                      )}
                    </span>

                    {/* Class pill (still reading DB `homeroom`) */}
                    <span>
                      {s.homeroom ? (
                        <span className={gradePill}>{s.homeroom}</span>
                      ) : (
                        <span className={emptyPill}>—</span>
                      )}
                    </span>

                    {/* Email */}
                    <span className="truncate">
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          className="text-slate-900 underline-offset-2 hover:underline"
                        >
                          {s.email}
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
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

      {/* Confirm Delete Modal */}
      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!deleting) setConfirmOpen(false);
        }}
        title="Delete students"
      >
        <div className="space-y-3">
          {confirmError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {confirmError}
            </div>
          )}
          <p className="text-sm">
            You’re about to delete <strong>{selected.size}</strong> student
            {selected.size === 1 ? "" : "s"}. This can’t be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              className="btn"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={onDeleteSelected}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
