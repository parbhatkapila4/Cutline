export type PlanId = "free" | "beginner" | "professional" | "enterprise";

export type PlanConfig = {
  id: PlanId;
  label: string;
  videosPerMonth: number | null;
  apiCallsPerMonth: number | null;
  /** Dashboard: no fixed token cap (paid tiers). */
  tokensUnlimited: boolean;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    videosPerMonth: 1,
    apiCallsPerMonth: 10_000,
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

