import type { PlanId } from "@/lib/plans";

const TEST_PRODUCTS = {
  beginner: "pdt_0NgWqp7Aj8x1F684nraPa",
  professional: "pdt_0NgWqySd8TIOkCw4DD0Wh",
} as const;

const LIVE_PRODUCTS = {
  beginner: "pdt_0NgWiYR3P9NfTvIRaz4Tb",
  professional: "pdt_0NgWjD5zGWSt5d26kuM83",
} as const;

export const CUTLINE_PRODUCTS: { beginner: string; professional: string } =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? LIVE_PRODUCTS : TEST_PRODUCTS;

export const ENTERPRISE_CONTACT_HREF =
  "mailto:parbhat@parbhat.work?subject=Cutline%20Enterprise%20inquiry";

export type CutlineProductKey = keyof typeof CUTLINE_PRODUCTS;

export const PLAN_TO_PRODUCT_ID: Partial<Record<PlanId, string>> = {
  beginner: CUTLINE_PRODUCTS.beginner,
  professional: CUTLINE_PRODUCTS.professional,
};

export const PRODUCT_ID_TO_PLAN: Record<string, PlanId> = {
  [CUTLINE_PRODUCTS.beginner]: "beginner",
  [CUTLINE_PRODUCTS.professional]: "professional",
};

export function isKnownProductId(productId: string | null | undefined): productId is string {
  return !!productId && productId in PRODUCT_ID_TO_PLAN;
}

export function planForProductId(productId: string | null | undefined): PlanId | null {
  if (!productId) return null;
  return PRODUCT_ID_TO_PLAN[productId] ?? null;
}
