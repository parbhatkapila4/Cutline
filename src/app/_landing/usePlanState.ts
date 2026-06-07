"use client";

import { useEffect, useState } from "react";

export type PlanId = "free" | "beginner" | "professional" | "enterprise";
export const PLAN_RANK: Record<string, number> = { free: 0, beginner: 1, professional: 2, enterprise: 3 };

type Resolved = { plan: PlanId; planLabel: string; authenticated: boolean };
export type PlanState =
  | { status: "loading" }
  | { status: "ready"; plan: PlanId; planLabel: string; subscribed: boolean };

let cache: Promise<Resolved> | null = null;
function fetchPlan(): Promise<Resolved> {
  if (!cache) {
    cache = fetch("/api/me/plan", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d): Resolved => ({
        plan: (d?.plan ?? "free") as PlanId,
        planLabel: d?.planLabel ?? "Free",
        authenticated: Boolean(d?.authenticated),
      }))
      .catch((): Resolved => ({ plan: "free", planLabel: "Free", authenticated: false }));
  }
  return cache;
}

export function usePlanState(): PlanState {
  const [state, setState] = useState<PlanState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    fetchPlan().then(({ plan, planLabel }) => {
      if (!active) return;
      setState({ status: "ready", plan, planLabel, subscribed: (PLAN_RANK[plan] ?? 0) > 0 });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
