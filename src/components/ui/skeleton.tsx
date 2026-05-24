type Tone = "light" | "dark";

type SkeletonProps = {
  className?: string;
  tone?: Tone;
};

/**
 * Skeleton primitive - a subtly shimmering placeholder block.
 *
 * Uses the global `skeleton-sheen` keyframe (declared in globals.css) which
 * translates a narrow gradient sweep across the element. Pass `tone="dark"`
 * for dark-themed pages.
 *
 * Compose dimensions and shape via className (e.g. `h-4 w-32 rounded-full`).
 */
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
    <div className={`relative overflow-hidden ${base} ${className}`} aria-hidden>
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
