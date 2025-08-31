"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  homeroom: string | null;
  email: string | null;
};

type ParsedRow = Omit<StudentRow, "id">;
const REQUIRED_HEADERS = ["first_name", "last_name"] as const;

// Insert payload shape (what we send to Supabase)
type StudentInsertRow = {
  owner_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: string | null;
  homeroom: string | null;
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase();
  if (["first", "firstname", "first name"].includes(key)) return "first_name";
  if (["last", "lastname", "last name"].includes(key)) return "last_name";
  if (key === "email") return "email";
  if (key === "grade") return "grade";
  if (key === "homeroom") return "homeroom";
  return key;
}

function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delimiter) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}

function sniffDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

function toParsedRows(text: string): { rows: ParsedRow[]; errors: string[] } {
  const errors: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) return { rows: [], errors: ["No data provided."] };

  const delimiter = sniffDelimiter(trimmed);
  const table = parseDelimited(trimmed, delimiter);
  if (table.length === 0) return { rows: [], errors: ["No rows detected."] };

  const rawHeaders = table[0].map(normalizeHeader);
  const headerSet = new Set(rawHeaders);

  for (const h of REQUIRED_HEADERS) {
    if (!headerSet.has(h)) errors.push(`Missing required column: "${h}"`);
  }
  if (errors.length) return { rows: [], errors };

  const rows: ParsedRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const get = (name: string) => {
      const idx = rawHeaders.indexOf(name);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const first = get("first_name");
    const last = get("last_name");
    if (!first && !last) continue;
    if (!first || !last) {
      errors.push(`Row ${r + 1}: first and last name are required.`);
      continue;
    }

    rows.push({
      first_name: first,
      last_name: last,
      email: get("email") || null,
      grade: get("grade") || null,
      homeroom: get("homeroom") || null,
    });
  }

  return { rows, errors };
}

export default function BulkAddStudents({
  onCreatedMany,
}: {
  onCreatedMany?: (rows: StudentRow[]) => void;
}) {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setOwnerId(data.session?.user.id ?? null);
    });
  }, []);

  // Auto-parse whenever raw changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!raw.trim()) {
        setParsed(null);
        setParseErrors([]);
        return;
      }
      const { rows, errors } = toParsedRows(raw);
      setParsed(errors.length ? null : rows);
      setParseErrors(errors);
    }, 150);
    return () => clearTimeout(t);
  }, [raw]);

  const preview = useMemo(() => parsed?.slice(0, 10) ?? [], [parsed]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setRaw(text); // auto-parse will kick in
  };

  const onDownloadTemplate = () => {
    const csv = `first_name,last_name,email,grade,homeroom
Ada,Smith,ada@school.org,9,201
Ben,Lee,,8,104
`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onInsert = async () => {
    setSaveError(null);
    if (!ownerId) { setSaveError("Not authenticated."); return; }
    if (!parsed || parsed.length === 0) {
      setSaveError("Nothing to import. Add data or fix errors first.");
      return;
    }
    setSaving(true);

    const supabase = getSupabase();
    const chunkSize = 200;
    const inserted: StudentRow[] = [];

    for (let i = 0; i < parsed.length; i += chunkSize) {
      const chunkPayload: StudentInsertRow[] = parsed.slice(i, i + chunkSize).map((r) => ({
        owner_id: ownerId,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        grade: r.grade,
        homeroom: r.homeroom,
      }));

      const { data, error } = await supabase
        .from("students")
        // Without generated DB types, Supabase generics default to `never`. Cast only here.
        .insert(chunkPayload as never)
        .select("id, first_name, last_name, email, grade, homeroom");

      if (error) {
        setSaving(false);
        setSaveError(
          `Insert failed near rows ${i + 1}-${Math.min(i + chunkSize, parsed.length)}: ${error.message}`
        );
        return;
      }

      const returned = (data ?? []) as unknown as StudentRow[];
      inserted.push(...returned);
    }

    setSaving(false);
    onCreatedMany?.(inserted);

    // reset
    setRaw("");
    setParsed(null);
    setParseErrors([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importDisabledReason =
    !ownerId ? "Sign in required" :
    parseErrors.length > 0 ? "Fix parse errors" :
    !parsed || parsed.length === 0 ? "No parsed rows" :
    saving ? "Importing…" :
    "";

  const importDisabled = !!importDisabledReason;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Bulk add students</h3>
        <p className="mt-1 text-sm text-slate-600">
          Upload a CSV or paste from a spreadsheet. Required headers:
          <span className="font-medium"> first_name, last_name</span>. Optional:
          <span className="font-medium"> email, grade, homeroom</span>.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onPickFile}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          />
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-slate-800 text-sm font-medium hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Download template
          </button>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">
            Paste CSV/TSV (headers required)
          </label>
          <textarea
            rows={8}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={`first_name,last_name,email,grade,homeroom
Ada,Smith,ada@school.org,9,201
Ben,Lee,,8,104`}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const { rows, errors } = toParsedRows(raw);
              setParsed(errors.length ? null : rows);
              setParseErrors(errors);
            }}
            className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-slate-800 text-sm font-medium hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            Re-preview
          </button>

          <button
            type="button"
            onClick={onInsert}
            disabled={importDisabled}
            aria-disabled={importDisabled}
            title={importDisabledReason || "Import"}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-white text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-70 ${
              importDisabled ? "bg-sky-600/60 cursor-not-allowed" : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            {saving ? "Importing…" : "Import"}
          </button>

          {fileName && <span className="text-sm text-slate-600">Selected: {fileName}</span>}
        </div>

        {parseErrors.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-medium">Fix these before importing:</div>
            <ul className="list-disc pl-5 mt-1">
              {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {parsed && (
          <div className="mt-4">
            <div className="text-sm text-slate-600">
              Previewing {Math.min(parsed.length, 10)} of {parsed.length} row{parsed.length === 1 ? "" : "s"}.
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-2 pr-4">First name</th>
                    <th className="py-2 pr-4">Last name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Grade</th>
                    <th className="py-2 pr-4">Homeroom</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="py-2 pr-4">{r.first_name}</td>
                      <td className="py-2 pr-4">{r.last_name}</td>
                      <td className="py-2 pr-4">{r.email ?? "—"}</td>
                      <td className="py-2 pr-4">{r.grade ?? "—"}</td>
                      <td className="py-2 pr-4">{r.homeroom ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {saveError}
          </div>
        )}
      </div>
    </div>
  );
}
