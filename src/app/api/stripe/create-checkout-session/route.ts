import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Robust base URL from the request (works on localhost/preview/prod)
    const base = new URL(req.url).origin;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const priceId = process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const success_url = `${base}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${base}/dashboard/billing?canceled=1`;

    if (!priceId) {
      const hostedCheckoutUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL;
      if (!hostedCheckoutUrl) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
      }

      const hostedUrl = new URL(hostedCheckoutUrl);
      if (user.email) {
        hostedUrl.searchParams.set("prefilled_email", user.email);
      }
      hostedUrl.searchParams.set("client_reference_id", user.id);
      hostedUrl.searchParams.set("success_url", success_url);
      hostedUrl.searchParams.set("cancel_url", cancel_url);

      return NextResponse.json({ url: hostedUrl.toString() });
    }

    const stripe = getStripe();

    // Reuse/create customer by email
    const existing = await stripe.customers.list({ email: user.email ?? undefined, limit: 1 });
    let customer = existing.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
    } else if (customer.metadata?.supabase_user_id !== user.id) {
      customer = await stripe.customers.update(customer.id, {
        metadata: { ...customer.metadata, supabase_user_id: user.id },
      });
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = { price: priceId, quantity: 1 };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url,
      cancel_url,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id },
      client_reference_id: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
