"use client";

import { useState, type ReactNode } from "react";

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
export function CheckoutButton({
  productId,
  className,
  children,
  loadingLabel = "Redirecting…",
  errorClassName = "mt-2 text-[12px] text-red-500",
}: {
  productId: string;
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
        {loading ? (
          <>
            <Spinner />
            <span>{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
      {error ? (
        <p className={errorClassName} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
