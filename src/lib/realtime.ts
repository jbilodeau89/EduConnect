"use client";

import { getSupabase } from "./supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Create a single broadcast channel (ignores messages from this same tab)
let _channel: RealtimeChannel | null = null;

export function getAppChannel(): RealtimeChannel | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (_channel) return _channel;

  try {
    _channel = getSupabase().channel("educontact-broadcast", {
      config: { broadcast: { self: false } },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Realtime channel unavailable:", error);
    }
    _channel = null;
  }

  return _channel;
}

// Backward-compatible default used by your components:
//   import { appChannel } from "@/lib/realtime"
//   appChannel?.on(...).subscribe()
export const appChannel: RealtimeChannel | null = getAppChannel();
