"use client";

import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        router.push("/");
        return;
      }
      const { user } = session;
      if (mounted) {
        setUserEmail(user?.email ?? undefined);
        const fallbackName =
          user?.user_metadata?.full_name || (user?.email?.split("@")[0] ?? "Teacher");
        setUserName(fallbackName);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:flex lg:gap-6">
          <Sidebar userName={userName} userEmail={userEmail} />
          <main className="flex-1 mt-6 lg:mt-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
