import type { ClientOptions } from "dodopayments";
import { getSql, isDatabaseConfigured } from "@/lib/db";
import { setUserPlan } from "@/lib/users/planService";
import { planForProductId } from "@/lib/products";
import { creditTopupSecondsOnce, debitTopupSeconds } from "@/lib/cost/budget";

export function dodoEnvironment(): ClientOptions["environment"] {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
}

export type DodoGrantInput = {
  eventKey: string;
  eventType: string;
  userId: string | undefined;
  productId: string | null;
  providerRef: string;
  customerId: string | null;
};

export async function grantPlanFromWebhook(input: DodoGrantInput): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error("[dodo-webhook] DATABASE_URL not configured; cannot process", input.eventKey);
    return;
  }

  const userId = await resolveWebhookUserId(input.userId, input.customerId);
  const plan = planForProductId(input.productId);
  if (!userId || !plan) {
    console.error("[dodo-webhook] not actionable", {
      eventKey: input.eventKey,
      hasUserId: Boolean(userId),
      productId: input.productId,
    });
    return;
  }

  const sql = getSql();

  const claimed = (await sql`
    INSERT INTO processed_webhook_events
      (event_key, event_type, user_id, plan, provider_ref, dodo_customer_id)
    VALUES
      (${input.eventKey}, ${input.eventType}, ${userId}, ${plan}, ${input.providerRef}, ${input.customerId})
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  `) as { event_key: string }[];

  if (claimed.length === 0) {
    console.log("[dodo-webhook] duplicate event ignored", input.eventKey);
    return;
  }

  try {
    await setUserPlan(userId, plan);
    if (input.customerId) {
      await setDodoCustomerId(userId, input.customerId);
    }
    console.log("[dodo-webhook] granted", { userId, plan, ref: input.providerRef });
  } catch (err) {
    try {
      await sql`DELETE FROM processed_webhook_events WHERE event_key = ${input.eventKey}`;
    } catch { }
    throw err;
  }
}

export type DodoTopupInput = {
  eventKey: string;
  eventType: string;
  userId: string | undefined;
  seconds: number;
  providerRef: string;
  customerId: string | null;
};

export async function creditTopupFromWebhook(input: DodoTopupInput): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error("[dodo-webhook] DATABASE_URL not configured; cannot process", input.eventKey);
    return;
  }

  const userId = await resolveWebhookUserId(input.userId, input.customerId);
  if (!userId || !Number.isFinite(input.seconds) || input.seconds <= 0) {
    console.error("[dodo-webhook] top-up not actionable", {
      eventKey: input.eventKey,
      hasUserId: Boolean(userId),
      seconds: input.seconds,
    });
    return;
  }

  const sql = getSql();
  const balance = await creditTopupSecondsOnce(userId, input.seconds, input.eventKey);

  const recorded = (await sql`
    INSERT INTO processed_webhook_events
      (event_key, event_type, user_id, plan, provider_ref, dodo_customer_id, topup_seconds)
    VALUES
      (${input.eventKey}, ${input.eventType}, ${userId}, ${null}, ${input.providerRef}, ${input.customerId}, ${input.seconds})
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  `) as { event_key: string }[];

  if (recorded.length === 0) {
    console.log("[dodo-webhook] duplicate top-up ignored", input.eventKey);
    return;
  }

  if (input.customerId) {
    try {
      await setDodoCustomerId(userId, input.customerId);
    } catch (err) {
      console.error(
        `[dodo-webhook] could not map customer ${input.customerId} to ${userId}: ` +
        `${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  console.log("[dodo-webhook] top-up credited", {
    userId,
    seconds: input.seconds,
    balance,
    ref: input.providerRef,
  });
}

export async function reverseTopupFromWebhook(input: {
  eventKey: string;
  eventType: string;
  userId: string | undefined;
  paymentId: string;
  customerId: string | null;
  isPartial?: boolean;
}): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error("[dodo-webhook] DATABASE_URL not configured; cannot process", input.eventKey);
    return;
  }

  const sql = getSql();
  const original = (await sql`
    SELECT user_id, topup_seconds
    FROM processed_webhook_events
    WHERE provider_ref = ${input.paymentId} AND topup_seconds > 0
    ORDER BY processed_at ASC
    LIMIT 1
  `) as { user_id: string | null; topup_seconds: number | null }[];

  const seconds = Number(original[0]?.topup_seconds ?? 0);
  const alreadyReversed = (await sql`
    SELECT 1 FROM processed_webhook_events
    WHERE provider_ref = ${input.paymentId} AND topup_seconds < 0
    LIMIT 1
  `) as unknown[];
  if (alreadyReversed.length > 0) {
    console.log("[dodo-webhook] top-up already reversed for this payment", {
      eventKey: input.eventKey,
      paymentId: input.paymentId,
    });
    return;
  }
  if (input.isPartial && seconds > 0) {
    console.error(
      `[dodo-webhook] PARTIAL REFUND ON A SECONDS TOP-UP, NOT AUTO-REVERSED. ` +
      `payment=${input.paymentId} originalSeconds=${seconds} event=${input.eventKey}. ` +
      `Decide the adjustment and apply it by hand.`
    );
    return;
  }
  const userId = original[0]?.user_id ?? (await resolveWebhookUserId(input.userId, input.customerId));
  if (!userId || seconds <= 0) {
    console.log("[dodo-webhook] refund is not a seconds top-up; nothing to reverse", {
      eventKey: input.eventKey,
      paymentId: input.paymentId,
    });
    return;
  }

  const claimed = (await sql`
    INSERT INTO processed_webhook_events
      (event_key, event_type, user_id, plan, provider_ref, dodo_customer_id, topup_seconds)
    VALUES
      (${input.eventKey}, ${input.eventType}, ${userId}, ${null}, ${input.paymentId}, ${input.customerId}, ${-seconds})
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  `) as { event_key: string }[];

  if (claimed.length === 0) {
    console.log("[dodo-webhook] duplicate refund ignored", input.eventKey);
    return;
  }

  try {
    const { balance, shortfall } = await debitTopupSeconds(userId, seconds);
    if (shortfall > 0) {
      console.error(
        `[dodo-webhook] REFUND SHORTFALL: user ${userId} refunded ${seconds}s but only ` +
        `${seconds - shortfall}s were unspent; ${shortfall}s had already been rendered and ` +
        `cannot be clawed back. Balance floored at ${balance}. payment=${input.paymentId}`
      );
    }
    console.log("[dodo-webhook] top-up reversed", { userId, seconds, balance, shortfall });
  } catch (err) {
    try {
      await sql`DELETE FROM processed_webhook_events WHERE event_key = ${input.eventKey}`;
    } catch { }
    throw err;
  }
}

export type DodoRevokeInput = {
  eventKey: string;
  eventType: string;
  userId: string | undefined;
  providerRef: string;
  customerId: string | null;
  reason: "cancelled" | "expired" | "on_hold";
};

export async function revokePlanFromWebhook(input: DodoRevokeInput): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error("[dodo-webhook] DATABASE_URL not configured; cannot process", input.eventKey);
    return;
  }

  const userId = await resolveWebhookUserId(input.userId, input.customerId);
  if (!userId) {
    console.error("[dodo-webhook] not actionable (revoke)", { eventKey: input.eventKey, reason: input.reason });
    return;
  }

  const sql = getSql();

  const claimed = (await sql`
    INSERT INTO processed_webhook_events
      (event_key, event_type, user_id, plan, provider_ref, dodo_customer_id)
    VALUES
      (${input.eventKey}, ${input.eventType}, ${userId}, ${"free"}, ${input.providerRef}, ${input.customerId})
    ON CONFLICT (event_key) DO NOTHING
    RETURNING event_key
  `) as { event_key: string }[];

  if (claimed.length === 0) {
    console.log("[dodo-webhook] duplicate event ignored", input.eventKey);
    return;
  }

  try {
    await setUserPlan(userId, "free");
    console.log("[dodo-webhook] revoked -> free", { userId, reason: input.reason, ref: input.providerRef });
  } catch (err) {
    try {
      await sql`DELETE FROM processed_webhook_events WHERE event_key = ${input.eventKey}`;
    } catch { }
    throw err;
  }
}

async function resolveWebhookUserId(
  metadataUserId: string | undefined,
  customerId: string | null,
): Promise<string | undefined> {
  if (metadataUserId) return metadataUserId;
  if (customerId) {
    const mapped = await getUserIdByDodoCustomerId(customerId);
    if (mapped) return mapped;
  }
  return undefined;
}

export async function getUserIdByDodoCustomerId(dodoCustomerId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT user_id FROM billing_customers WHERE dodo_customer_id = ${dodoCustomerId} LIMIT 1
  `) as { user_id: string }[];
  return rows[0]?.user_id ?? null;
}

export async function setDodoCustomerId(userId: string, dodoCustomerId: string): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO billing_customers (user_id, dodo_customer_id)
    VALUES (${userId}, ${dodoCustomerId})
    ON CONFLICT (user_id)
    DO UPDATE SET dodo_customer_id = EXCLUDED.dodo_customer_id, updated_at = now()
  `;
}

export async function getDodoCustomerId(userId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const sql = getSql();
  const rows = (await sql`
    SELECT dodo_customer_id FROM billing_customers WHERE user_id = ${userId} LIMIT 1
  `) as { dodo_customer_id: string }[];
  return rows[0]?.dodo_customer_id ?? null;
}
