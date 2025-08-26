"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignOutButton({
  variant = "primary",
  children,
}: {
  variant?: "primary" | "ghost";
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const onClick = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const base =
    "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";
  const styles =
    variant === "primary"
      ? "bg-sky-600 text-white hover:bg-sky-700"
      : "bg-slate-100 text-slate-800 hover:bg-slate-200";

  return (
    <button className={`${base} ${styles}`} onClick={onClick}>
      {children ?? "Sign out"}
    </button>
  );
}
