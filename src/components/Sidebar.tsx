"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
        active
          ? "bg-sky-100 text-sky-800"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen p-4">
      <div className="px-2 py-3">
        <div className="text-sm font-semibold text-slate-900">EduContact</div>
        <div className="text-xs text-slate-500">Teacher tools</div>
      </div>
      <nav className="mt-4 space-y-1">
        <NavLink href="/dashboard">Overview</NavLink>
        <NavLink href="/dashboard/students">Students</NavLink>
        <NavLink href="/dashboard/contacts">Contacts</NavLink>
        <NavLink href="/dashboard/billing">Billing</NavLink>
        <NavLink href="/dashboard/settings">Settings</NavLink>
      </nav>
    </aside>
  );
}
