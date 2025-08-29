import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Compute base URL from the actual request (works locally, preview, prod)
    const base = new URL(req.url).origin;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const priceId = process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: "Missing STRIPE_PRICE_ID" }, { status: 500 });

    const success_url = `${base}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${base}/dashboard/billing?canceled=1`;

    // Reuse/create customer by email
    const existing = await stripe.customers.list({ email: user.email ?? undefined, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });

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
  } catch (err: any) {
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
