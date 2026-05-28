import { isProPlan, type PlanId } from "@/lib/plans";

/**
 * Small "PRO" badge shown in front of features reserved for Professional &
 * Enterprise plans. It self-hides for Pro+ users, so call sites can render it
 * unconditionally and pass the current plan:
 *
 *   <ProBadge plan={userPlan} />
 *
 * Pass `plan={undefined}` (or a free/beginner plan) to always show it.
 */
export function ProBadge({
  plan,
  className = "",
  withLock = false,
  size = "md",
  title = "Available on Professional & Enterprise plans",
}: {
  plan?: PlanId | string | null;
  className?: string;
  withLock?: boolean;
  size?: "xs" | "md";
  title?: string;
}) {
  // Hide entirely for Pro and above — they already have access.
  if (isProPlan(plan)) return null;

  const sizing =
    size === "xs"
      ? "gap-0.5 px-1 py-0 text-[8px] tracking-[0.06em]"
      : "gap-1 px-[7px] py-[1px] text-[9.5px] tracking-[0.1em]";

  return (
    <span
      title={title}
      className={
        "inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 font-semibold uppercase leading-none text-amber-300 align-middle " +
        sizing +
        " " +
        className
      }
    >
      {withLock && (
        <svg
          className={size === "xs" ? "h-2 w-2" : "h-[9px] w-[9px]"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.4}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z"
          />
        </svg>
      )}
      Pro
    </span>
  );
}
