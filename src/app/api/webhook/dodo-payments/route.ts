import { Webhooks } from "@dodopayments/nextjs";
import {
  grantPlanFromWebhook,
  revokePlanFromWebhook,
  creditTopupFromWebhook,
  reverseTopupFromWebhook,
} from "@/lib/payments/dodo";
import { isTopupProductId, topupSecondsForProductId } from "@/lib/products";

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
      eventKey: `subscription.active:${d.subscription_id}:${d.product_id}:${cycleKey(d.next_billing_date, d.previous_billing_date)}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      productId: d.product_id,
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
    });
  },

  onSubscriptionPlanChanged: async (payload) => {
    const d = payload.data;
    await grantPlanFromWebhook({
      eventKey: `subscription.plan_changed:${d.subscription_id}:${d.product_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      productId: d.product_id,
      providerRef: d.subscription_id,
      customerId: d.customer?.customer_id ?? null,
    });
  },

  onPaymentSucceeded: async (payload) => {
    const d = payload.data;
    const productId = d.product_cart?.[0]?.product_id ?? null;
    const customerId = d.customer?.customer_id ?? null;
    const userId = userIdOf(d.metadata as Record<string, unknown>);

    if (isTopupProductId(productId)) {
      await creditTopupFromWebhook({
        eventKey: `payment.succeeded:${d.payment_id}`,
        eventType: payload.type,
        userId,
        seconds: topupSecondsForProductId(productId),
        providerRef: d.payment_id,
        customerId,
      });
      return;
    }

    await grantPlanFromWebhook({
      eventKey: `payment.succeeded:${d.payment_id}`,
      eventType: payload.type,
      userId,
      productId,
      providerRef: d.payment_id,
      customerId,
    });
  },

  onRefundSucceeded: async (payload) => {
    const d = payload.data;
    await reverseTopupFromWebhook({
      eventKey: `refund.succeeded:${d.refund_id}`,
      eventType: payload.type,
      userId: userIdOf(d.metadata as Record<string, unknown>),
      paymentId: d.payment_id,
      customerId: d.customer?.customer_id ?? null,
      isPartial: d.is_partial === true,
    });
  },

  onDisputeLost: async (payload) => {
    const d = payload.data;
    await reverseTopupFromWebhook({
      eventKey: `dispute.lost:${d.dispute_id}`,
      eventType: payload.type,
      userId: undefined,
      paymentId: d.payment_id,
      customerId: null,
      isPartial: false,
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
