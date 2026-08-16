import type { ReactNode } from "react";

type Tone = "light" | "dark";

type SkeletonProps = {
  className?: string;
  tone?: Tone;
};

export function Skeleton({ className = "", tone = "light" }: SkeletonProps) {
  const base =
    tone === "dark"
      ? "bg-white/[0.04] ring-1 ring-white/[0.04]"
      : "bg-gray-100 ring-1 ring-gray-200/50";
  const sweep =
    tone === "dark"
      ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 45%, rgba(255,255,255,0.07) 55%, transparent 100%)"
      : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.85) 55%, transparent 100%)";

  return (
    <div
      className={`relative overflow-hidden ${base} ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-y-0 left-0 w-full pointer-events-none"
        style={{
          background: sweep,
          animation: "skeleton-sheen 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  tone = "light",
  className = "",
  lineClassName = "h-3.5",
}: {
  lines?: number;
  tone?: Tone;
  className?: string;
  lineClassName?: string;
}) {
  const widths = ["w-full", "w-[92%]", "w-[97%]", "w-[88%]", "w-[94%]"];
  return (
    <div className={`flex flex-col gap-2.5 ${className}`} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          tone={tone}
          className={`rounded-full ${lineClassName} ${
            i === lines - 1 ? "w-[62%]" : widths[i % widths.length]
          }`}
        />
      ))}
    </div>
  );
}

export function PendingLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`skeleton-label ${className}`} aria-live="polite">
      {children}
    </span>
  );
}

export function SkeletonFrame({
  className = "",
  tone = "dark",
  compact = false,
}: {
  className?: string;
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col justify-end gap-2 p-3 ${className}`}
      aria-hidden
    >
      <Skeleton
        tone={tone}
        className={`rounded-full ${compact ? "h-2 w-1/2" : "h-2.5 w-2/3"}`}
      />
      <Skeleton
        tone={tone}
        className={`rounded-full ${compact ? "h-1.5 w-1/4" : "h-2 w-1/3"}`}
      />
    </div>
  );
}
