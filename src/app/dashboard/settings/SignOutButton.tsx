"use client";

import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export default function SignOutButton() {
  const router = useRouter();

  const onClick = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/"); // back to landing
  };

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-slate-800 text-sm font-medium hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    >
      Sign out
    </button>
  );
}
