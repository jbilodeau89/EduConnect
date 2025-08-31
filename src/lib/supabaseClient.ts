"use client";

import { createClientComponentClient, type SupabaseClient } from "@supabase/auth-helpers-nextjs";

// Keep the type coming from the same package as the factory to avoid mismatches
let client: SupabaseClient | null = null;

/** Lazily create the browser Supabase client only when first used (avoids build-time errors). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClientComponentClient();
  return client;
}
