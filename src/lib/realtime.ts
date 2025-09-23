"use client";

import { getSupabase } from "./supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Create a single broadcast channel (ignores messages from this same tab)
let _channel: RealtimeChannel | null = null;

export function getAppChannel(): RealtimeChannel | null {
  if (typeof window === "undefined") return null;
  if (_channel) return _channel;
  _channel = getSupabase().channel("educontact-broadcast", {
    config: { broadcast: { self: false } },
  });
  return _channel;
}
