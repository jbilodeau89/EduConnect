"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SubscribePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Make sure there is a session; if not, bounce to sign-in and come back here.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const next = encodeURIComponent("/onboarding/subscribe");
        router.replace(`/?mode=signin&next=${next}`);
        return;
      }

      try {
        // Don't follow redirects; we expect JSON from our API.
        const res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          redirect: "manual",
        });

        // If someone left a redirect in the route by mistake, handle it anyway.
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("Location");
          if (loc && !cancelled) {
            window.location.href = loc;
            return;
          }
        }

        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
          if (!data?.url) throw new Error("No checkout URL returned");
          if (!cancelled) window.location.href = data.url;
          return;
        } else {
          // Unexpected HTML/text response -> surface a useful error
          const text = await res.text();
          throw new Error(`Unexpected response: ${res.status} ${text.slice(0, 200)}`);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Unable to start checkout");
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
          <p className="text-sm text-slate-700">If this doesn’t redirect, sign in again and billing will be available under Dashboard → Billing.</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
