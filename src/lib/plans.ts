export type PlanId = "free" | "beginner" | "professional" | "enterprise";

export type PlanConfig = {
  id: PlanId;
  label: string;
  videosPerMonth: number | null;
  apiCallsPerMonth: number | null;
  tokensUnlimited: boolean;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    videosPerMonth: 1,
    apiCallsPerMonth: 1,
    tokensUnlimited: false,
  },
  beginner: {
    id: "beginner",
    label: "Beginner",
    videosPerMonth: 10,
    apiCallsPerMonth: 25_000,
    tokensUnlimited: false,
  },
  professional: {
    id: "professional",
    label: "Professional",
    videosPerMonth: null,
    apiCallsPerMonth: 100_000,
    tokensUnlimited: true,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    videosPerMonth: null,
    apiCallsPerMonth: null,
    tokensUnlimited: true,
  },
};

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "beginner" || value === "professional" || value === "enterprise";
}

export function isEnterprisePlan(plan: string | undefined | null): boolean {
  return plan === "enterprise";
}

// "Pro and above": Professional or Enterprise. The single source of truth for
// every Pro-gated feature (badge visibility, UI locks, and server enforcement).
export function isProPlan(plan: string | undefined | null): boolean {
  return plan === "professional" || plan === "enterprise";
}

