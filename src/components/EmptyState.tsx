import * as React from "react";

export default function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-ivory/60 px-6 py-10 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-brand-50 text-brand-700 grid place-items-center ring-1 ring-brand-100">
        <span className="text-lg">✧</span>
      </div>
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {hint && <div className="mt-1 text-sm text-slate-600">{hint}</div>}
    </div>
  );
}
