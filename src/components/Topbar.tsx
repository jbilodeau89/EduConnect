"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

type Props = {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
};

export default function Topbar({ onToggleSidebar, sidebarCollapsed }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="text-base sm:text-lg tracking-tight">EduContact</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">{/* right-side actions (optional) */}</div>
      </div>
    </header>
  );
}
