"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/students", label: "Students" },
  { href: "/dashboard/contacts", label: "Contacts" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-full w-full sm:w-64 shrink-0">
      <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-white shadow-sm">
        {/* Brand bar */}
        <div className="bg-brand text-white px-5 py-4">
          <div className="text-base font-semibold tracking-tight">EduContact</div>
          <div className="text-[11px] opacity-85">Persian Plum / Ivory Quartz</div>
        </div>

        {/* Nav */}
        <nav className="p-3">
          <ul className="space-y-1 list-none">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={
                      active
                        ? "flex items-center justify-between rounded-lg bg-ivory text-brand-800 ring-1 ring-slate-200 px-3 py-2 text-sm font-medium"
                        : "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    }
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        active
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
