"use client";

import { useState, type ReactNode } from "react";
import { PendingLabel } from "@/components/ui/skeleton";
import { trackCheckoutStart, type PlanParam } from "@/lib/analytics/ga";
export function CheckoutButton({
  productId,
  plan,
  className,
  children,
  loadingLabel = "Redirecting…",
  errorClassName = "mt-2 text-[12px] text-red-500",
}: {
  productId: string;
  plan: PlanParam;
  className: string;
  children: ReactNode;
  loadingLabel?: string;
  errorClassName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    if (loading) return;
    setError(null);
    setLoading(true);
    trackCheckoutStart(plan);
    try {
      const res = await fetch(`/api/checkout?productId=${encodeURIComponent(productId)}`);
      if (res.status === 401) {
        window.location.href = "/auth/sign-in";
        return;
      }
      if (!res.ok) {
        setError("Couldn’t start checkout. Please try again.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { checkout_url?: string };
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setError("Couldn’t start checkout. Please try again.");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        aria-busy={loading}
        className={className}
      >
        {loading ? <PendingLabel>{loadingLabel}</PendingLabel> : children}
      </button>
      {error ? (
        <p className={errorClassName} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
