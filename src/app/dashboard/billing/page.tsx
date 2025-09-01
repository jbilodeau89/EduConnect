"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/** Prevent static prerendering for this page (it depends on client-only URL params). */
export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading billing…</div>}>
      <BillingClient />
    </Suspense>
  );
}

function BillingClient() {
  const sp = useSearchParams();
  const success = sp.get("success");
  const canceled = sp.get("canceled");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openPortal = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      if (!res.ok) throw new Error(`Portal HTTP ${res.status}`);
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("No portal URL returned");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to open billing portal");
      setBusy(false);
    }
  };

  const goSubscribe = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
      if (!res.ok) throw new Error(`Checkout HTTP ${res.status}`);
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to start checkout");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm muted">
          Manage your EduContact subscription and invoices.
        </p>
      </header>

      <section className="card p-6 space-y-4">
        {(success || canceled) && (
          <div
            role="alert"
            className={`rounded-lg border p-3 text-sm ${
              success
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {success ? "Payment succeeded. Welcome aboard!" : "Checkout was canceled."}
          </div>
        )}

        {err && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            {err}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={goSubscribe}
            disabled={busy}
            className="btn btn-brand"
          >
            {busy ? "Working…" : "Subscribe ($1/mo)"}
          </button>

          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className="btn"
          >
            {busy ? "Opening…" : "Open Billing Portal"}
          </button>

          <Link href="/dashboard" className="btn bg-slate-100 text-slate-800 hover:bg-slate-200">
            Back to Dashboard
          </Link>
        </div>

        <p className="text-xs muted">
          Having trouble? If the buttons don’t redirect, make sure your Stripe keys and webhook
          URL are configured in Vercel project settings.
        </p>
      </section>
    </div>
  );
}
