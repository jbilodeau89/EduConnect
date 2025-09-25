// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduContact",
  description: "A teacher-friendly way to log communications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-shell">
      <body className="min-h-screen bg-shell font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
