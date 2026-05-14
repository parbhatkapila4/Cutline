"use client";

import { useState } from "react";
import Link from "next/link";
import { CutlineLogo } from "@/components/brand/CutlineLogo";
import { PLAN_CONFIGS, type PlanId } from "@/lib/plans";
import { PURCHASABLE_PLANS } from "@/lib/stripe";
import { DODO_PAYMENT_URL } from "@/lib/payments/links";

export default function PricingPage() {
  const [error, setError] = useState<string | null>(null);

  const purchasablePlanIds = Object.keys(PURCHASABLE_PLANS) as PlanId[];
  const plans = purchasablePlanIds
    .map((planId) => {
      const purchasable = PURCHASABLE_PLANS[planId];
      const config = PLAN_CONFIGS[purchasable.planId];
      return {
        id: purchasable.planId,
        label: purchasable.label,
        amountCents: purchasable.amountCents,
        videosPerMonth: config.videosPerMonth,
        apiCallsPerMonth: config.apiCallsPerMonth,
        tokensUnlimited: config.tokensUnlimited,
        highlighted: purchasable.planId === "professional",
      };
    })
    .sort((a, b) => a.amountCents - b.amountCents);

  const handlePurchase = () => {
    setError(null);
    window.open(DODO_PAYMENT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex justify-start bg-black/60 backdrop-blur-sm border-b border-white/5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white border border-white/20 hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
        >
          <CutlineLogo size="sm" className="max-w-[140px]" />
          <span>Home</span>
        </Link>
      </div>

      <main className="pt-24 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[min(90vw,1760px)] mx-auto">
          <section className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">Pricing</h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-3xl">
              Straight answer: we charge because every generated video creates real backend cost - model calls, rendering
              compute, and storage/bandwidth.
            </p>
            <p className="mt-3 text-sm text-zinc-500 max-w-3xl">
              No fake urgency, no fake discounts. Pick the tier that matches your monthly usage.
            </p>
          </section>

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <section className="mb-12 rounded-2xl border border-white/10 bg-white/2 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-white mb-3">How billing works right now</h2>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>- Checkout is currently one-time for each plan purchase (not recurring subscription yet).</li>
              <li>- Plan limits are enforced monthly (videos, API calls, token behavior by tier).</li>
              <li>- If this changes to recurring billing, this page and checkout copy will be updated clearly.</li>
            </ul>
          </section>

          <section className="grid md:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${plan.highlighted ? "border-amber-400/50 bg-amber-500/5" : "border-white/10 bg-zinc-950"
                  }`}
              >
                <div className="mb-4">
                  {plan.highlighted && (
                    <span className="inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 mb-3">
                      Most used
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{plan.label}</h3>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-4xl font-bold">${(plan.amountCents / 100).toFixed(0)}</span>
                    <span className="text-sm text-zinc-500 pb-1">pay once</span>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-zinc-300 flex-1">
                  <li>{plan.videosPerMonth == null ? "Unlimited videos per month" : `${plan.videosPerMonth} videos per month`}</li>
                  <li>
                    {plan.apiCallsPerMonth == null
                      ? "Unlimited API calls per month"
                      : `${plan.apiCallsPerMonth.toLocaleString()} API calls per month`}
                  </li>
                  <li>{plan.tokensUnlimited ? "Unlimited tokens" : "Token cap applies"}</li>
                  <li>MP4 export</li>
                </ul>

                <button
                  type="button"
                  onClick={handlePurchase}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${plan.highlighted
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "border border-white/20 hover:bg-white/5"
                    }`}
                >
                  Get Started
                </button>

                <p className="mt-3 text-xs text-zinc-500">
                  Secure checkout via{" "}
                  <a
                    href={DODO_PAYMENT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-zinc-300"
                  >
                    Dodo Payments
                  </a>{" "}
                  (update this link to your final checkout URL later).
                </p>
              </article>
            ))}
          </section>

          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold mb-3">Why pricing exists</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>- Model calls cost money per request (prompt analysis, scripting, visuals, voice generation).</li>
                <li>- Video rendering is compute-heavy and runs in worker queues.</li>
                <li>- Generated assets and video delivery require storage + bandwidth.</li>
                <li>- Reliability costs include infra, monitoring, and retries when providers fail.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-semibold mb-3">What you are paying for</h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>- Higher monthly limits so you can generate more without being blocked.</li>
                <li>- More backend budget allocated to your account (especially compute-heavy flows).</li>
                <li>- Predictable access to the generation pipeline at your usage level.</li>
              </ul>
              <p className="mt-5 text-sm text-zinc-400">
                Need help choosing? Email{" "}
                <a href="mailto:parbhat@parbhat.work" className="underline hover:text-zinc-200">
                  parbhat@parbhat.work
                </a>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
