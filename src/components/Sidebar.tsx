"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CreditCard,
  Settings,
} from "lucide-react";

type Props = { collapsed?: boolean };

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/students", label: "Students", Icon: Users },
  { href: "/dashboard/contacts", label: "Contacts", Icon: MessageSquare },
  { href: "/dashboard/billing", label: "Billing", Icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
];

export default function Sidebar({ collapsed = false }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className={`h-full rounded-2xl border border-black/10 bg-white p-2 ${
        collapsed ? "w-[68px]" : "w-64"
      } transition-[width]`}
    >
      <ul className="space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          const base =
            "flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
          const activeCls = active ? "bg-brand/10 text-brand-900" : "text-slate-700";
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
  );
}
