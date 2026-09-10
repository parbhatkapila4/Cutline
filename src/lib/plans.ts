export type PlanId = "free" | "beginner" | "professional" | "enterprise";

export type PlanConfig = {
  id: PlanId;
  label: string;
  videosPerMonth: number | null;
  apiCallsPerMonth: number | null;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    videosPerMonth: 3,
    apiCallsPerMonth: 3,
  },
  beginner: {
    id: "beginner",
    label: "Beginner",
    videosPerMonth: 10,
    apiCallsPerMonth: 25_000,
  },
  professional: {
    id: "professional",
    label: "Professional",
    videosPerMonth: null,
    apiCallsPerMonth: 100_000,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    videosPerMonth: null,
    apiCallsPerMonth: null,
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

