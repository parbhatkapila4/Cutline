import { getStripe, PURCHASABLE_PLANS } from "@/lib/stripe";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { setUserPlan } from "@/lib/users/planService";
import type { PlanId } from "@/lib/plans";

export type VerifyResult =
  | { success: true; plan: PlanId; alreadyProcessed: boolean }
  | { success: false; reason: string };

/**
 * Verifies a Stripe checkout session, confirms the payment amount matches the
 * expected plan price, records completion in the `payments` table, and upgrades
 * the user's plan. Both the webhook and the client-side verify endpoint call
 * this function — the `payments.status` column makes it idempotent.
 */
export async function verifyAndUpgrade(sessionId: string): Promise<VerifyResult> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return { success: false, reason: "Payment has not been completed yet." };
  }

  const planId = session.metadata?.planId;
  if (!planId || !(planId in PURCHASABLE_PLANS)) {
    return { success: false, reason: "Invalid plan associated with this payment." };
  }

  const userId = session.metadata?.userId;
  if (!userId) {
    return { success: false, reason: "No user linked to this payment session." };
  }

  const expectedAmount = PURCHASABLE_PLANS[planId].amountCents;
  if (session.amount_total !== expectedAmount) {
    return { success: false, reason: "Payment amount does not match the selected plan." };
  }

  if (!isDatabaseConfigured()) {
    return { success: false, reason: "Database is not configured." };
  }

  const sql = getSql();

  const existing = (await sql`
    SELECT status FROM payments
    WHERE stripe_checkout_session_id = ${sessionId}
    LIMIT 1
  `) as { status: string }[];

  if (existing.length > 0 && existing[0].status === "completed") {
    return { success: true, plan: planId as PlanId, alreadyProcessed: true };
  }

  await sql`
    UPDATE payments
    SET status = 'completed',
        stripe_payment_intent_id = ${(session.payment_intent as string) || null},
        completed_at = now()
    WHERE stripe_checkout_session_id = ${sessionId}
      AND status != 'completed'
  `;

  await setUserPlan(userId, planId as PlanId);

  return { success: true, plan: planId as PlanId, alreadyProcessed: false };
}
