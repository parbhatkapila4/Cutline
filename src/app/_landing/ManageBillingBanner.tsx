"use client";

import { usePlanState } from "./usePlanState";
export function ManageBillingBanner({
  className,
  linkClassName,
  label = "Manage plan",
}: {
  className: string;
  linkClassName: string;
  label?: string;
}) {
  const state = usePlanState();
  if (state.status !== "ready" || !state.subscribed) return null;
  return (
    <div className={className}>
      <span>
        You’re on the <span className="font-semibold capitalize">{state.planLabel}</span> plan. Upgrades, downgrades,
        and cancellation are handled in the billing portal.
      </span>
      <a href="/api/customer-portal" className={linkClassName}>
        {label}
      </a>
    </div>
  );
}
