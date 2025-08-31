import Stripe from "stripe";

let _stripe: Stripe | null = null;

/** Lazily create a Stripe client only when actually used (runtime), not at build time. */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Will be caught by route handlers and returned as JSON during runtime.
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

/** Helper to build absolute URLs when you can't derive from Request (fallback). */
export function absoluteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
