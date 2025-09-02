"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const nav = [
    { href: "/demo", label: "Dashboard" },
    { href: "/demo/contacts", label: "Contacts" },
    { href: "/demo/students", label: "Students" },
  ];

  const gridExpanded = "grid grid-cols-[14rem_1fr] gap-6";
  const gridCollapsed = "grid grid-cols-[3.5rem_1fr] gap-6";

  return (
    <div className="min-h-screen bg-ivory">
      <div className="bg-brand text-white">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed((c) => !c)}
              className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-sm"
            >
              {collapsed ? "Expand" : "Collapse"}
            </button>
            <span className="font-semibold">EduContact — Demo</span>
          </div>
          <div className="text-sm opacity-90">Read-only</div>
        </div>
      </div>

      <div className={`px-4 sm:px-6 py-6 ${collapsed ? gridCollapsed : gridExpanded}`}>
        <aside className="self-start sticky top-4">
          <div className="card p-3">
            <nav className="space-y-1">
              {nav.map((n) => {
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      active ? "bg-brand text-white" : "hover:bg-slate-100 text-slate-800"
                    } ${collapsed ? "text-center" : ""}`}
                    title={collapsed ? n.label : undefined}
                  >
                    {collapsed ? n.label[0] : n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-black/10 pt-3">
              <Link href="/" className="text-sm underline">
                Exit Demo
              </Link>
            </div>

            <div className="mt-3">
              <span className="inline-block rounded-full bg-ivory text-brand-900 border border-brand/20 px-2.5 py-0.5 text-xs">
                Demo mode: read-only
              </span>
            </div>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
