"use client";

import type { ReactNode } from "react";
import { CheckoutButton } from "./CheckoutButton";
import { usePlanState, PLAN_RANK, type PlanId } from "./usePlanState";

function Check() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function PlanCta({
  planId,
  productId,
  contactHref,
  primaryClassName,
  secondaryClassName,
  currentClassName,
  errorClassName,
  manageLabel = "Manage plan",
  currentLabel = "Current plan",
  upgradeLabel = "Upgrade",
  includedLabel = "Included with every account",
  children,
}: {
  planId: PlanId;
  productId?: string;
  contactHref?: string;
  primaryClassName: string;
  secondaryClassName: string;
  currentClassName: string;
  errorClassName?: string;
  manageLabel?: string;
  currentLabel?: string;
  upgradeLabel?: string;
  includedLabel?: string;
  children: ReactNode;
}) {
  const state = usePlanState();

  const ready = state.status === "ready" ? state : null;
  const currentPlan: PlanId = ready?.plan ?? "free";
  const authenticated = ready?.authenticated ?? false;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const targetRank = PLAN_RANK[planId] ?? 0;
  if (authenticated && currentPlan === planId) {
    return (
      <div className={currentClassName} role="status">
        <Check />
        {currentLabel}
      </div>
    );
  }

  if (planId === "free") {
    if (authenticated) {
      return <div className={currentClassName}>{includedLabel}</div>;
    }
    return (
      <a href={contactHref ?? "/auth/sign-in"} className={primaryClassName}>
        {children}
      </a>
    );
  }
  if (contactHref) {
    return (
      <a href={contactHref} className={primaryClassName}>
        {children}
      </a>
    );
  }
  if (!productId) return null;
  if (currentRank > 0 && targetRank < currentRank) {
    return (
      <a href="/api/customer-portal" className={secondaryClassName}>
        {manageLabel}
      </a>
    );
  }

  return (
    <CheckoutButton
      productId={productId}
      className={primaryClassName}
      errorClassName={errorClassName}
    >
      {currentRank > 0 ? upgradeLabel : children}
    </CheckoutButton>
  );
}
