"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

// Ensure this route never gets statically pre-rendered
export const dynamic = "force-dynamic";

export default function SubscribePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const next = encodeURIComponent("/onboarding/subscribe");
        router.replace(`/?mode=signin&next=${next}`);
        return;
      }
      try {
        const res = await fetch("/api/stripe/create-checkout-session", { method: "POST", redirect: "manual" });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("Location");
          if (loc && !cancelled) { window.location.href = loc; return; }
        }
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Unexpected response: ${res.status} ${text.slice(0,200)}`);
        }
        const data = await res.json();
        if (!res.ok || !data?.url) throw new Error(data?.error || "No checkout URL");
        if (!cancelled) window.location.href = data.url;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(message || "Unable to start checkout");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="card">
        <div className="card-header">
          <h1 className="text-base font-semibold">Redirecting to secure checkout…</h1>
        </div>
        <div className="card-body">
          <p className="text-sm text-slate-700">
            If this doesn’t redirect, sign in again; Billing will be available in the dashboard.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
