import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const PAYMENT_LINK_URL =
  process.env.STRIPE_PAYMENT_LINK_URL ||
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL ||
  "https://buy.stripe.com/7sYbJ19A23Eb6aGfP9fbq04";

export async function POST(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const priceId = process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!priceId) {
      if (!PAYMENT_LINK_URL) {
        return NextResponse.json({ error: "Payment link not configured" }, { status: 500 });
      }

      const url = new URL(PAYMENT_LINK_URL);
      if (user.email) url.searchParams.set("prefilled_email", user.email);
      url.searchParams.set("client_reference_id", user.id);

      return NextResponse.json({ url: url.toString() });
    }

    const stripe = getStripe();

    const existing = await stripe.customers.list({ email: user.email ?? undefined, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });

    const success_url = `${baseUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${baseUrl}/dashboard/billing?canceled=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url,
      cancel_url,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
