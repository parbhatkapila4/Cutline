import { getSql, isDatabaseConfigured } from "@/lib/db";
import { PLAN_CONFIGS, type PlanConfig, type PlanId, isPlanId } from "@/lib/plans";

type UserPlanRow = {
  plan: string;
};

export async function getUserPlan(userId: string | undefined): Promise<PlanConfig> {
  if (!userId || userId.trim() === "" || !isDatabaseConfigured()) {
    return PLAN_CONFIGS.free;
  }
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT plan
      FROM user_plan_overrides
      WHERE user_id = ${userId}
      LIMIT 1
    `) as UserPlanRow[];
    const planRaw = rows[0]?.plan;
    if (typeof planRaw === "string" && isPlanId(planRaw)) {
      return PLAN_CONFIGS[planRaw];
    }
  } catch {
    // Fall back to free when table doesn't exist or DB query fails.
  }
  return PLAN_CONFIGS.free;
}

export async function setUserPlan(userId: string, plan: PlanId): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO user_plan_overrides (user_id, plan)
    VALUES (${userId}, ${plan})
    ON CONFLICT (user_id)
    DO UPDATE SET
      plan = EXCLUDED.plan,
      updated_at = now()
  `;
}

