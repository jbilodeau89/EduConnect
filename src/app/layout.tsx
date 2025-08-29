import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EduContact",
  description: "Log and track teacher communications with families and students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-slate-50 text-slate-800">
        {children}
      </body>
    </html>
  );
}
