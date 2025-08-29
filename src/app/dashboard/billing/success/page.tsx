export default function Success() {
  return (
    <div className="max-w-lg mx-auto card">
      <div className="card-body">
        <h1 className="text-xl font-semibold">Thanks! 🎉</h1>
        <p className="mt-2 text-slate-600">Payment successful. You can manage billing under Dashboard → Billing.</p>
        <a className="mt-4 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700" href="/dashboard">
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
