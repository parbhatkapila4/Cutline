import Stripe from "stripe";
import type { PlanId } from "@/lib/plans";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

export type PurchasablePlan = {
  planId: PlanId;
  amountCents: number;
  label: string;
};

export const PURCHASABLE_PLANS: Record<string, PurchasablePlan> = {
  beginner: { planId: "beginner", amountCents: 2900, label: "Beginner" },
  professional: { planId: "professional", amountCents: 5900, label: "Professional" },
  enterprise: { planId: "enterprise", amountCents: 8900, label: "Enterprise" },
};
