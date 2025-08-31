"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const search = useSearchParams();
  const router = useRouter();

  const success = search.get("success") === "1";
  const canceled = search.get("canceled") === "1";

  // Clean query params after showing the banner
  useEffect(() => {
    if (success || canceled) {
      const t = setTimeout(() => {
        router.replace("/dashboard/billing");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [success, canceled, router]);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (e) {
      alert("Could not open billing portal.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold">Billing</h1>

      {(success || canceled) && (
        <div
          role="status"
          className={`rounded-lg p-3 text-sm ${
            success
              ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          {success ? "Payment successful. Thanks!" : "Checkout canceled. You weren’t charged."}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="text-base font-semibold">EduContact — $1/month</div>
        </div>
        <div className="card-body">
          <p className="text-sm text-slate-600">
            Manage your subscription, update your card, or cancel any time.
          </p>
          <button
            onClick={openPortal}
            disabled={loading}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Opening…" : "Manage Billing"}
          </button>
        </div>
      </div>
    </div>
  );
}
