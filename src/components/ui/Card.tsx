import * as React from "react";
import { HTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm",
        props.className
      )}
    />
  );
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx("px-6 py-4 flex items-center justify-between", props.className)}
    />
  );
}

export function CardTitle(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx("text-base font-semibold text-slate-900", props.className)}
    />
  );
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("px-6 py-4", props.className)} />;
}
