"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PendingLabel, Skeleton, SkeletonText } from "@/components/ui/skeleton";

const PAID_PLANS = new Set(["beginner", "professional", "enterprise"]);
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 6;

function SuccessContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const failed = status != null && !["active", "succeeded", "processing"].includes(status);

  const [phase, setPhase] = useState<"checking" | "active" | "pending">("checking");
  const [planLabel, setPlanLabel] = useState<string | null>(null);

  useEffect(() => {
    if (failed) return;
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      try {
        const res = await fetch("/api/me/plan", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { plan?: string; planLabel?: string };
          if (data.plan && PAID_PLANS.has(data.plan)) {
            setPlanLabel(data.planLabel ?? data.plan);
            setPhase("active");
            return;
          }
        }
      } catch {
      }
      tries += 1;
      if (cancelled) return;
      if (tries >= MAX_POLLS) {
        setPhase("pending");
        return;
      }
      window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [failed]);

  if (failed) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Payment didn’t complete</h1>
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            No charge was made. You can pick a plan again from the pricing page.
          </p>
          <div className="mt-8">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Back to Pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription confirmed</h1>

        {phase === "active" ? (
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            You’re on the <span className="text-white font-semibold capitalize">{planLabel}</span> plan. Your access is live.
          </p>
        ) : phase === "pending" ? (
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            Payment received. Your subscription is being activated - this usually takes a few seconds. Refresh this page, or
            head to your dashboard; access will appear automatically.
          </p>
        ) : (
          <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
            <PendingLabel>Payment received - activating your access…</PendingLabel>
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Create a video
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <div className="w-full max-w-lg text-center">
            <Skeleton tone="dark" className="mx-auto h-14 w-14 rounded-2xl" />
            <Skeleton tone="dark" className="mx-auto mt-6 h-8 w-64 rounded-lg" />
            <div className="mx-auto mt-5 max-w-md">
              <SkeletonText tone="dark" lines={2} lineClassName="h-3" />
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Skeleton tone="dark" className="h-11 w-44 rounded-xl" />
              <Skeleton tone="dark" className="h-11 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
