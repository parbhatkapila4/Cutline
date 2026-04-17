"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_CONFIGS, type PlanId } from "@/lib/plans";
import { PURCHASABLE_PLANS } from "@/lib/stripe";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const purchasablePlanIds = Object.keys(PURCHASABLE_PLANS) as PlanId[];
  const plans = purchasablePlanIds
    .map((planId) => {
      const purchasable = PURCHASABLE_PLANS[planId];
      const config = PLAN_CONFIGS[purchasable.planId];
      return {
        id: purchasable.planId,
        label: purchasable.label,
        priceUsd: `$${(purchasable.amountCents / 100).toFixed(0)}`,
        videosPerMonth: config.videosPerMonth,
        apiCallsPerMonth: config.apiCallsPerMonth,
        tokensUnlimited: config.tokensUnlimited,
        highlighted: purchasable.planId === "professional",
      };
    })
    .sort((a, b) => a.priceUsd.localeCompare(b.priceUsd, undefined, { numeric: true }));

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
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pricing</h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
              This page is intentionally plain-spoken. Cutline costs real money to run (AI models + rendering + storage),
              so paid plans help cover those costs.
            </p>
          </div>
          <Link href="/create" className="shrink-0 text-sm text-zinc-400 hover:text-white transition-colors">
            Back to Create
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted ? "border-amber-400/50 bg-amber-500/5" : "border-white/10 bg-zinc-950"
              }`}
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">{plan.priceUsd}</span>
                <span className="text-sm text-zinc-500">one-time</span>
              </div>
              <h2 className="text-xl font-semibold">{plan.label}</h2>
              <p className="text-sm text-zinc-400 mt-2">
                Limits reset monthly (calendar month). This is a one-time purchase in the current build — not a
                subscription.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300 flex-1">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {plan.videosPerMonth == null ? "Unlimited videos / month" : `${plan.videosPerMonth} videos / month`}
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {plan.apiCallsPerMonth == null
                    ? "Unlimited API calls / month"
                    : `${plan.apiCallsPerMonth.toLocaleString()} API calls / month`}
                </li>
                <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {plan.tokensUnlimited ? "Unlimited tokens (no compute cap)" : "Token-based compute cap (cost control)"}
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Exports: MP4 via Remotion render
                </li>
              </ul>

              <button
                type="button"
                disabled={loadingPlan != null}
                onClick={() => handlePurchase(plan.id)}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/20 hover:bg-white/5"
                }`}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Redirecting to checkout&hellip;
                  </>
                ) : (
                  "Buy plan"
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <h3 className="text-base font-semibold">Why we charge</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>AI usage isn’t free: text models, image retrieval/generation, and voice generation cost money per run.</li>
              <li>Rendering costs money: Remotion renders are CPU/GPU heavy and we run them on workers + a queue.</li>
              <li>Storage + bandwidth: generated videos need to be stored and downloaded reliably.</li>
              <li>Ops: Redis/DB, monitoring, and keeping the pipeline stable takes ongoing work.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <h3 className="text-base font-semibold">What you’re actually buying</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>A plan flag on your account (used to enforce limits and compute caps).</li>
              <li>Monthly limits that reset on the calendar month (videos + API calls, depending on tier).</li>
              <li>
                A checkout that is currently <span className="text-zinc-200">one-time</span> (not recurring). If/when we
                add subscriptions, this page and checkout will be updated to match.
              </li>
            </ul>
            <p className="mt-4 text-sm text-zinc-400">
              Questions or issues? Email{" "}
              <a href="mailto:parbhat@parbhat.dev" className="underline hover:text-zinc-200">
                parbhat@parbhat.dev
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
