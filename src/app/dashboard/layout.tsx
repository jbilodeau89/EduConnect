// src/app/dashboard/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Collapsed sidebar state, persisted in localStorage
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem("sidebarCollapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  // 256px expanded, 68px collapsed
  const asideWidth = collapsed ? "w-[68px]" : "w-64";

  return (
    <>
      <Topbar onToggleSidebar={toggleSidebar} sidebarCollapsed={collapsed} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 py-6">
          {/* Sidebar (sticky under top bar) */}
          <aside
            className={`${asideWidth} shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto`}
          >
            <Sidebar collapsed={collapsed} />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}
