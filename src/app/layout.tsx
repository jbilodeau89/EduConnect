// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EduContact",
  description: "A teacher-friendly way to log communications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-ivory">
      <body className={`${inter.className} min-h-screen bg-ivory text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
