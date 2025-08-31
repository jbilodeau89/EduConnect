"use client";

import { getSupabase } from "./supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Create a single broadcast channel (ignores messages from this same tab)
let _channel: RealtimeChannel | null = null;

export function getAppChannel(): RealtimeChannel {
  if (_channel) return _channel;
  _channel = getSupabase().channel("educontact-broadcast", {
    config: { broadcast: { self: false } },
  });
  return _channel;
}

// Backward-compatible default used by your components:
//   import { appChannel } from "@/lib/realtime"
//   appChannel.on(...).subscribe()
export const appChannel: RealtimeChannel = getAppChannel();
