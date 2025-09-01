// src/app/dashboard/layout.tsx
import Sidebar from "@/components/Sidebar";
import type { Metadata } from "next";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "EduContact – Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* If you use a sidebar, wrap like this:
        <div className="flex gap-6">
          <aside className="hidden md:block w-56 shrink-0">
            <Sidebar />
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
        */}
        {children}
      </div>
    </>
  );
}
