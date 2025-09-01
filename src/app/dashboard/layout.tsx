// src/app/dashboard/layout.tsx
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <div className="flex">
        <aside className="w-64 shrink-0 border-r border-black/10 bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <Sidebar />
        </aside>
        <main className="flex-1 p-6 md:p-8 space-y-6">{children}</main>
      </div>
    </div>
  );
}
