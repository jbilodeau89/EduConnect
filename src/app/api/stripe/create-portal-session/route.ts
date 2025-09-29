import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const base = new URL(req.url).origin;
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stripe = getStripe();

    const return_url = `${base}/dashboard/billing`;

    const byMetadata = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });

    let customer: Stripe.Customer | undefined = byMetadata.data[0];

    if (!customer && user.email) {
      const byEmail = await stripe.customers.list({ email: user.email, limit: 1 });
      customer = byEmail.data[0];
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
    } else if (customer.metadata?.supabase_user_id !== user.id) {
      await stripe.customers.update(customer.id, {
        metadata: { ...customer.metadata, supabase_user_id: user.id },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
