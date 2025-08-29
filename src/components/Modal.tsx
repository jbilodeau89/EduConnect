"use client";

import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent background scroll & focus the close button for accessibility
  useEffect(() => {
    const { style } = document.body;
    const prev = style.overflow;
    if (open) {
      style.overflow = "hidden";
      // slight delay to ensure render
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } else {
      style.overflow = prev;
    }
    return () => {
      style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between p-6 pb-3">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="px-6 pb-6 pt-2">{children}</div>
        {footer ? <div className="border-t border-slate-200 px-6 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
