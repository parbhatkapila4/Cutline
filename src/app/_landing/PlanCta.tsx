"use client";

import type { ReactNode } from "react";
import { CheckoutButton } from "./CheckoutButton";
import { usePlanState, type PlanId } from "./usePlanState";

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
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
  children: ReactNode;
}) {
  const state = usePlanState();

  if (state.status === "loading") {
    return (
      <button type="button" disabled aria-busy="true" className={primaryClassName}>
        <Spinner />
      </button>
    );
  }

  if (state.subscribed && state.plan === planId) {
    return (
      <div className={currentClassName} role="status" aria-disabled="true">
        <Check />
        {currentLabel}
      </div>
    );
  }

  if (contactHref) {
    return (
      <a href={contactHref} className={primaryClassName}>
        {children}
      </a>
    );
  }

  if (!state.subscribed) {
    if (!productId) return null;
    return (
      <CheckoutButton productId={productId} className={primaryClassName} errorClassName={errorClassName}>
        {children}
      </CheckoutButton>
    );
  }

  return (
    <a href="/api/customer-portal" className={secondaryClassName}>
      {manageLabel}
    </a>
  );
}
