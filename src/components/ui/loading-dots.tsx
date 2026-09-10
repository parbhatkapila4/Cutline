import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoadingDots({
  pending,
  className,
}: {
  pending: boolean;
  className?: string;
}) {
  if (!pending) return null;
  return (
    <span className={cn("loading-dots", className)} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}

export function LoadingLabel({
  hidden,
  children,
}: {
  hidden: boolean;
  children: ReactNode;
}) {
  return (
    <span className="loading-label" data-hidden={hidden || undefined}>
      {children}
    </span>
  );
}
