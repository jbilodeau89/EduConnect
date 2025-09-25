import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

const PAYMENT_LINK_URL =
  process.env.STRIPE_PAYMENT_LINK_URL ||
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL ||
  "https://buy.stripe.com/7sYbJ19A23Eb6aGfP9fbq04";

const POST_SUBSCRIBE_RETURN_PATH = "/dashboard/billing?success=1";

export async function POST(req: Request) {
  try {
    const base = new URL(req.url).origin;

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(PAYMENT_LINK_URL);
    if (user.email) {
      url.searchParams.set("prefilled_email", user.email);
    }
    url.searchParams.set("client_reference_id", user.id);

    const returnUrl = `${base}${POST_SUBSCRIBE_RETURN_PATH}`;

    return NextResponse.json({ url: url.toString(), returnUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
