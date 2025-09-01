"use client";

import Image from "next/image";
import Link from "next/link";

export default function Topbar() {
  return (
    <div className="sticky top-0 z-40 w-full bg-brand text-ivory shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* Renders the PNG from /public */}
            <Image
              src="/educontact-logo.png"
              alt="EduContact"
              width={28}
              height={28}
              priority
              className="h-7 w-7 rounded-sm"
            />
            <span className="text-base font-semibold tracking-tight">EduContact</span>
          </Link>

          {/* right side placeholder for future actions */}
          <div className="ml-auto flex items-center gap-3" />
        </div>
      </div>
    </div>
  );
}
