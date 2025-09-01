export default function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-8 text-center">
      <div className="text-sm font-medium text-slate-900">{title}</div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
