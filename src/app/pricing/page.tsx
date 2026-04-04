"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICING } from "@/constants/landing";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    setLoadingPlan(planId);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = "/auth/sign-in";
        return;
      }
      if (!res.ok) {
        setError(data.error || "Unable to start checkout. Please try again.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Pricing</h1>
          <Link href="/create" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Back to Create
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.highlighted ? "border-amber-400/50 bg-amber-500/5" : "border-white/10 bg-zinc-950"}`}
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">{plan.monthlyPrice}</span>
                <span className="text-sm text-zinc-500">/ Per Month</span>
              </div>
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="text-sm text-zinc-400 mt-2">{plan.description}</p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={loadingPlan != null}
                onClick={() => handlePurchase(plan.planId)}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/20 hover:bg-white/5"
                }`}
              >
                {loadingPlan === plan.planId ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Redirecting to checkout&hellip;
                  </>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
