export type PlanId = "free" | "beginner" | "professional" | "enterprise";

export type PlanConfig = {
  id: PlanId;
  label: string;
  videosPerMonth: number | null;
  apiCallsPerMonth: number | null;
  tokensUnlimited: boolean;
  tokensPerMonth: number | null;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    videosPerMonth: 1,
    apiCallsPerMonth: 1,
    tokensUnlimited: false,
    tokensPerMonth: 10,
  },
  beginner: {
    id: "beginner",
    label: "Beginner",
    videosPerMonth: 10,
    apiCallsPerMonth: 25_000,
    tokensUnlimited: false,
    tokensPerMonth: 120,
  },
  professional: {
    id: "professional",
    label: "Professional",
    videosPerMonth: null,
    apiCallsPerMonth: 100_000,
    tokensUnlimited: true,
    tokensPerMonth: null,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    videosPerMonth: null,
    apiCallsPerMonth: null,
    tokensUnlimited: true,
    tokensPerMonth: null,
  },
};

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "beginner" || value === "professional" || value === "enterprise";
}

export function isEnterprisePlan(plan: string | undefined | null): boolean {
  return plan === "enterprise";
}

export function isProPlan(plan: string | undefined | null): boolean {
  return plan === "professional" || plan === "enterprise";
}

