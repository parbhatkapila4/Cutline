import { Webhooks } from "@dodopayments/nextjs";
import { grantPlanFromWebhook, revokePlanFromWebhook } from "@/lib/payments/dodo";

export const runtime = "nodejs";

function userIdOf(metadata: Record<string, unknown> | undefined): string | undefined {
  return typeof metadata?.userId === "string" ? metadata.userId : undefined;
}

function cycleKey(next?: Date | null, prev?: Date | null): string {
  const dt = next ?? prev ?? null;
  const ms = dt instanceof Date ? dt.getTime() : NaN;
  return Number.isFinite(ms) ? String(ms) : "0";
}

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,

  onSubscriptionActive: async (payload) => {
    const d = payload.data;
    await grantPlanFromWebhook({
      eventKey: `subscription.active:${d.subscription_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      productId: d.product_id,
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
    });
  },

  onPaymentSucceeded: async (payload) => {
    const d = payload.data;
    await grantPlanFromWebhook({
      eventKey: `payment.succeeded:${d.payment_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      productId: d.product_cart?.[0]?.product_id ?? null,
      providerRef: d.payment_id,
      customerId: d.customer?.customer_id ?? null,
    });
  },

  onSubscriptionRenewed: async (payload) => {
    const d = payload.data;
    await grantPlanFromWebhook({
      eventKey: `subscription.renewed:${d.subscription_id}:${cycleKey(d.next_billing_date, d.previous_billing_date)}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      productId: d.product_id,
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
    });
  },

  onSubscriptionCancelled: async (payload) => {
    const d = payload.data;
    await revokePlanFromWebhook({
      eventKey: `subscription.cancelled:${d.subscription_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
      reason: "cancelled",
    });
  },

  onSubscriptionExpired: async (payload) => {
    const d = payload.data;
    await revokePlanFromWebhook({
      eventKey: `subscription.expired:${d.subscription_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
      reason: "expired",
    });
  },

  onSubscriptionOnHold: async (payload) => {
    const d = payload.data;
    await revokePlanFromWebhook({
      eventKey: `subscription.on_hold:${d.subscription_id}:${cycleKey(d.next_billing_date, d.previous_billing_date)}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
      reason: "on_hold",
    });
  },
});
