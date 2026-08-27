import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line-strong bg-card p-5 shadow-[3px_3px_0_hsl(var(--ink)/0.06)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
}
