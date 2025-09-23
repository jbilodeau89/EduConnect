"use client";

import * as React from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "secondary" | "ghost";
};

export function Button({ className, variant = "brand", ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const v =
    variant === "brand"
      ? "text-white bg-brand hover:bg-brand-600 focus-visible:outline-brand"
      : variant === "secondary"
      ? "text-brand-700 bg-shell hover:bg-white focus-visible:outline-brand ring-1 ring-brand/10"
      : "text-slate-700 hover:bg-slate-100 focus-visible:outline-brand";

  return <button className={cx(base, v, className)} {...rest} />;
}
