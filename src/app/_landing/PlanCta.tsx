"use client";

import { useState, type ReactNode } from "react";
import { CheckoutButton } from "./CheckoutButton";
import { LoadingLink } from "@/components/ui/loading-link";
import { LoadingDots, LoadingLabel } from "@/components/ui/loading-dots";
import { cn } from "@/lib/utils";
import { usePlanState, PLAN_RANK, type PlanId } from "./usePlanState";

function Check() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function PlanLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (href.startsWith("http")) {
    return (
      <ExternalLink href={href} className={className} newTab>
        {children}
      </ExternalLink>
    );
  }
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <LoadingLink href={href} className={className}>
      {children}
    </LoadingLink>
  );
}

function ExternalLink({
  href,
  className,
  newTab,
  children,
}: {
  href: string;
  className: string;
  newTab?: boolean;
  children: ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  return (
    <a
      href={href}
      className={cn("relative", className)}
      aria-busy={leaving || undefined}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={(event) => {
        if (leaving) {
          event.preventDefault();
          return;
        }
        setLeaving(true);
      }}
    >
      <LoadingLabel hidden={leaving}>{children}</LoadingLabel>
      <LoadingDots pending={leaving} />
    </a>
  );
}

export function PortalLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <ExternalLink href="/api/customer-portal" className={className}>
      {children}
    </ExternalLink>
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
  secondaryContactHref,
  secondaryContactLabel,
  secondaryContactClassName,
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
  secondaryContactHref?: string;
  secondaryContactLabel?: string;
  secondaryContactClassName?: string;
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
      <PlanLink href={contactHref ?? "/auth/sign-in"} className={primaryClassName}>
        {children}
      </PlanLink>
    );
  }
  if (contactHref) {
    return (
      <PlanLink href={contactHref} className={primaryClassName}>
        {children}
      </PlanLink>
    );
  }
  if (!productId) return null;
  if (currentRank > 0 && targetRank < currentRank) {
    return <PortalLink className={secondaryClassName}>{manageLabel}</PortalLink>;
  }

  return (
    <>
      <CheckoutButton
        productId={productId}
        plan={planId}
        className={primaryClassName}
        errorClassName={errorClassName}
      >
        {currentRank > 0 ? upgradeLabel : children}
      </CheckoutButton>
      {secondaryContactHref ? (
        <a href={secondaryContactHref} className={secondaryContactClassName}>
          {secondaryContactLabel ?? "Talk to us first"}
        </a>
      ) : null}
    </>
  );
}
