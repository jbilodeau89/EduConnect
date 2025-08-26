"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = { userName?: string; userEmail?: string };

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/students", label: "Students" },
  { href: "/dashboard/contacts", label: "Contact Logs" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Sidebar({ userName, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
        <div className="mb-6">
          <div className="text-lg font-semibold text-slate-900">EduContact</div>
          <div className="mt-1 text-xs text-slate-600">
            {userName || "Teacher"}{userEmail ? ` · ${userEmail}` : ""}
          </div>
        </div>

        <nav className="space-y-1" aria-label="Sidebar">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
                  active ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          <button
            onClick={signOut}
            className="w-full inline-flex items-center justify-center rounded-lg bg-slate-100 px-4 py-2 text-slate-800 text-sm font-medium hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
