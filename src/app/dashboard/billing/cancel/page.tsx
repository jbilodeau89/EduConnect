export default function Cancel() {
  return (
    <div className="max-w-lg mx-auto card">
      <div className="card-body">
        <h1 className="text-xl font-semibold">Checkout canceled</h1>
        <p className="mt-2 text-slate-600">You weren’t charged. You can try again any time.</p>
        <a className="mt-4 inline-flex items-center rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50" href="/pricing">
          Back to Pricing
        </a>
      </div>
    </div>
  );
}
