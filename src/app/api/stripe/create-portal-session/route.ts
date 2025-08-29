import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe, absoluteUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const return_url = absoluteUrl("/dashboard/billing");

  const existing = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
  const customer = existing.data[0] ?? await stripe.customers.create({
    email: user.email || undefined,
    metadata: { supabase_user_id: user.id },
  });

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url,
  });

  return NextResponse.json({ url: session.url });
}
