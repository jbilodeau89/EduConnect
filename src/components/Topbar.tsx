"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

type Props = {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
};

export default function Topbar({ onToggleSidebar, sidebarCollapsed }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-brand/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand/10 text-brand hover:bg-brand/5"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/dashboard"
            className="flex flex-col leading-tight text-brand-700"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">
              EduConnect
            </span>
            <span className="text-lg font-semibold text-brand">
              Family Communication Hub
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <div className="flex flex-col items-end">
            <span className="font-medium text-brand">Build trust every day</span>
            <span className="text-xs text-slate-500">
              Track connections, celebrate wins, close the loop with families
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
