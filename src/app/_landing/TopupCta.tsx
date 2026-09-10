"use client";

import { CheckoutButton } from "./CheckoutButton";
import { usePlanState } from "./usePlanState";
import { TOPUP_SECONDS } from "@/lib/products";

export function TopupCta({
  productId,
  className,
  errorClassName,
}: {
  productId: string;
  className: string;
  errorClassName?: string;
}) {
  const state = usePlanState();

  if (state.status !== "ready") {
    return <div aria-hidden className="h-11 w-[210px] animate-pulse rounded-xl bg-white/10" />;
  }

  const eligible = state.plan === "professional" || state.plan === "enterprise";
  if (!eligible) {
    return (
      <p className="max-w-[240px] text-sm text-zinc-400">
        Extra seconds are an add-on to Professional. Upgrade above and the option
        appears here.
      </p>
    );
  }

  return (
    <CheckoutButton
      productId={productId}
      plan={state.plan}
      className={className}
      errorClassName={errorClassName}
    >
      {`Add ${TOPUP_SECONDS} seconds`}
    </CheckoutButton>
  );
}
