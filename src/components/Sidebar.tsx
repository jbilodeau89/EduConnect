"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SVGProps, ReactElement } from "react";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const HomeIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const UsersIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M2 21a7 7 0 0 1 14 0" />
    <circle cx="17" cy="8" r="3" />
    <path d="M14 14a7 7 0 0 1 8 7" />
  </svg>
);

const MessageSquareIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

const BarChartIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="M3 3v18h18" />
    <rect x="6" y="12" width="3" height="6" />
    <rect x="11" y="9" width="3" height="9" />
    <rect x="16" y="6" width="3" height="12" />
  </svg>
);

const SettingsIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.06a2 2 0 1 1-3.36 0l.02-.06A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.02a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15c0-.32-.1-.63-.27-.9l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.27.17.58.27.9.27s.63-.1.9-.27l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.17.27-.27.58-.27.9s.1.63.27.9l.06.06a2 2 0 1 1 2.83-2.83l-.06.06c-.17.27-.27.58-.27.9z" />
  </svg>
);

const ChevronLeftIcon: IconComponent = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

/* ---------- Nav config with proper typing ---------- */
type NavItem = {
  href: string;
  label: string;
  Icon: IconComponent;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: HomeIcon },
  { href: "/dashboard/students", label: "Students", Icon: UsersIcon },
  { href: "/dashboard/contacts", label: "Contacts", Icon: MessageSquareIcon },
  { href: "/dashboard/analytics", label: "Analytics", Icon: BarChartIcon },
  { href: "/dashboard/settings", label: "Settings", Icon: SettingsIcon },
];

/* ---------- Sidebar ---------- */
export default function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <aside
      className={`shrink-0 border-r border-brand/10 bg-white/90 backdrop-blur transition-all shadow-[0_30px_60px_-45px_rgba(15,23,42,0.4)] ${
        collapsed ? "w-16" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-500">
              Teacher Studio
            </span>
            <span className="text-lg font-semibold text-brand">EduConnect</span>
          </div>
        )}
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-md p-1.5 text-brand hover:bg-brand/5"
        >
          <ChevronLeftIcon className={`h-5 w-5 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {!collapsed && (
        <div className="mx-3 mb-4 rounded-2xl border border-brand/10 bg-shell p-3 text-xs text-slate-600">
          <div className="font-semibold text-brand mb-1">This week</div>
          <p className="leading-relaxed">
            Log daily touchpoints to keep every family in the loop. Review insights in
            Analytics to spot who needs a follow-up.
          </p>
        </div>
      )}

      <nav className="px-2">
        <ul className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + "/");
            const base =
              "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
            const activeCls = active ? "bg-brand/10 text-brand" : "text-slate-600";
            return (
              <li key={href}>
                <Link href={href} title={label} className={`${base} ${activeCls}`}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
