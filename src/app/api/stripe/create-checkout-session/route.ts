import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

const PAYMENT_LINK_URL =
  process.env.STRIPE_PAYMENT_LINK_URL ||
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL ||
  "https://buy.stripe.com/7sYbJ19A23Eb6aGfP9fbq04";

export async function POST() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!PAYMENT_LINK_URL) {
      return NextResponse.json({ error: "Payment link not configured" }, { status: 500 });
    }

    // With the hosted Stripe Payment Link the session is preconfigured on Stripe's side.
    // We simply hand the URL back to the client so it can redirect as before.
    return NextResponse.json({ url: PAYMENT_LINK_URL });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
