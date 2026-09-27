export type PlanId = "free" | "beginner" | "professional" | "enterprise";
export const FREE_VIDEO_RETENTION_HOURS = 24;
export const PAID_VIDEO_RETENTION_HOURS = 90 * 24;

export type PlanConfig = {
  id: PlanId;
  label: string;
  videosPerMonth: number | null;
  apiCallsPerMonth: number | null;
  videoRetentionHours: number;
};

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    videosPerMonth: 3,
    apiCallsPerMonth: 3,
    videoRetentionHours: FREE_VIDEO_RETENTION_HOURS,
  },
  beginner: {
    id: "beginner",
    label: "Beginner",
    videosPerMonth: 10,
    apiCallsPerMonth: 25_000,
    videoRetentionHours: PAID_VIDEO_RETENTION_HOURS,
  },
  professional: {
    id: "professional",
    label: "Professional",
    videosPerMonth: null,
    apiCallsPerMonth: 100_000,
    videoRetentionHours: PAID_VIDEO_RETENTION_HOURS,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    videosPerMonth: null,
    apiCallsPerMonth: null,
    videoRetentionHours: PAID_VIDEO_RETENTION_HOURS,
  },
};

export function isPlanId(value: string): value is PlanId {
  return value === "free" || value === "beginner" || value === "professional" || value === "enterprise";
}
export const MIN_VIDEO_RETENTION_HOURS = Math.min(
  ...Object.values(PLAN_CONFIGS).map((p) => p.videoRetentionHours)
);
export function videoRetentionHoursForPlan(plan: string | undefined | null): number {
  if (typeof plan === "string" && isPlanId(plan)) {
    return PLAN_CONFIGS[plan].videoRetentionHours;
  }
  return PLAN_CONFIGS.free.videoRetentionHours;
}

export function isEnterprisePlan(plan: string | undefined | null): boolean {
  return plan === "enterprise";
}

export function isProPlan(plan: string | undefined | null): boolean {
  return plan === "professional" || plan === "enterprise";
}

