"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Local singleton; keep it untyped to avoid cross-package type drift
let client: unknown = null;

/** Lazily create the browser Supabase client only when first used. */
export function getSupabase() {
  if (client) return client as ReturnType<typeof createClientComponentClient>;
  client = createClientComponentClient();
  return client as ReturnType<typeof createClientComponentClient>;
}
