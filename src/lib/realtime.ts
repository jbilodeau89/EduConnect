"use client";

import { supabase } from "./supabaseClient";

export const appChannel = supabase.channel("educontact-broadcast", {
  config: { broadcast: { self: false } }, // ignore messages from this same tab
});