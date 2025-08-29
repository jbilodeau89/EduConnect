"use client";
import { useState } from "react";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
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
      <div className="card">
        <div className="card-header"><div className="text-base font-semibold">EduContact Pro</div></div>
        <div className="card-body">
          <p className="text-sm text-slate-600">Manage your subscription, update your card, or cancel any time.</p>
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
