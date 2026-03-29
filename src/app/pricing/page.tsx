"use client";

import Link from "next/link";
import { PRICING } from "@/constants/landing";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Pricing</h1>
          <Link href="/create" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Back to Create
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${plan.highlighted ? "border-amber-400/50 bg-amber-500/5" : "border-white/10 bg-zinc-950"}`}
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">{plan.monthlyPrice}</span>
                <span className="text-sm text-zinc-500">/ Per Month</span>
              </div>
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="text-sm text-zinc-400 mt-2">{plan.description}</p>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>

              <Link
                href="/create"
                className={`mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors ${plan.highlighted ? "bg-white text-black hover:bg-zinc-200" : "border border-white/20 hover:bg-white/5"}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

