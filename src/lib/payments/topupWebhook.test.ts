import { describe, it, expect, beforeEach, vi } from "vitest";
type Row = {
  event_key: string;
  event_type: string;
  user_id: string | null;
  plan: string | null;
  provider_ref: string | null;
  dodo_customer_id: string | null;
  topup_seconds: number | null;
};

const rows = new Map<string, Row>();
const seconds = new Map<string, number>();
const applied = new Set<string>();

let sqlMode: "ok" | "throw-on-insert" = "ok";

function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.join("?").replace(/\s+/g, " ").trim();
  if (sqlMode === "throw-on-insert" && text.startsWith("INSERT INTO processed_webhook_events")) {
    return Promise.reject(new Error("neon down"));
  }

  if (text.startsWith("INSERT INTO processed_webhook_events")) {
    const [event_key, event_type, user_id, plan, provider_ref, dodo_customer_id, topup_seconds] =
      values as [string, string, string, string | null, string, string | null, number | null];
    if (rows.has(event_key)) return Promise.resolve([]);
    rows.set(event_key, {
      event_key,
      event_type,
      user_id,
      plan,
      provider_ref,
      dodo_customer_id,
      topup_seconds: topup_seconds ?? null,
    });
    return Promise.resolve([{ event_key }]);
  }

  if (text.startsWith("SELECT user_id, topup_seconds")) {
    const paymentId = values[0] as string;
    const hit = [...rows.values()].find(
      (r) => r.provider_ref === paymentId && r.topup_seconds != null && r.topup_seconds > 0
    );
    return Promise.resolve(hit ? [{ user_id: hit.user_id, topup_seconds: hit.topup_seconds }] : []);
  }

  if (text.startsWith("SELECT 1 FROM processed_webhook_events")) {
    const paymentId = values[0] as string;
    const hit = [...rows.values()].some(
      (r) => r.provider_ref === paymentId && (r.topup_seconds ?? 0) < 0
    );
    return Promise.resolve(hit ? [{ ok: 1 }] : []);
  }

  if (text.startsWith("DELETE FROM processed_webhook_events")) {
    rows.delete(values[0] as string);
    return Promise.resolve([]);
  }

  if (text.startsWith("INSERT INTO billing_customers")) return Promise.resolve([]);
  if (text.startsWith("SELECT user_id FROM billing_customers")) return Promise.resolve([]);

  throw new Error("unexpected SQL: " + text);
}

vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => true,
  getSql: () => sqlTag,
}));

vi.mock("@/lib/users/planService", () => ({ setUserPlan: vi.fn(async () => { }) }));

vi.mock("@/lib/cost/budget", () => ({
  creditTopupSecondsOnce: vi.fn(async (id: string, s: number, eventKey: string) => {
    if (applied.has(eventKey)) return seconds.get(id) ?? 0;
    applied.add(eventKey);
    const next = (seconds.get(id) ?? 0) + s;
    seconds.set(id, next);
    return next;
  }),
  debitTopupSeconds: vi.fn(async (id: string, s: number) => {
    const next = (seconds.get(id) ?? 0) - s;
    if (next < 0) {
      seconds.set(id, 0);
      return { balance: 0, shortfall: -next };
    }
    seconds.set(id, next);
    return { balance: next, shortfall: 0 };
  }),
}));

const { creditTopupFromWebhook, reverseTopupFromWebhook, grantPlanFromWebhook } = await import("./dodo");
const { ENTERPRISE_PRODUCT_ID, TOPUP_PRODUCT_ID, planForProductId } = await import("@/lib/products");

const USER = "user-1";
const PAYMENT = "pay_abc";

const payment = (over: Partial<Parameters<typeof creditTopupFromWebhook>[0]> = {}) =>
  creditTopupFromWebhook({
    eventKey: `payment.succeeded:${PAYMENT}`,
    eventType: "payment.succeeded",
    userId: USER,
    seconds: 200,
    providerRef: PAYMENT,
    customerId: "cus_1",
    ...over,
  });

beforeEach(() => {
  vi.clearAllMocks();
  rows.clear();
  seconds.clear();
  applied.clear();
});

describe("webhook dedupe", () => {
  it("credits once", async () => {
    await payment();
    expect(seconds.get(USER)).toBe(200);
  });

  it("credits ONCE for the same event delivered twice", async () => {
    await payment();
    await payment();
    expect(seconds.get(USER)).toBe(200);
    expect(rows.size).toBe(1);
  });

  it("survives a storm of redeliveries", async () => {
    await Promise.all(Array.from({ length: 8 }, () => payment()));
    expect(seconds.get(USER)).toBe(200);
  });

  it("credits twice for two genuinely different payments", async () => {
    await payment();
    await payment({ eventKey: "payment.succeeded:pay_def", providerRef: "pay_def" });
    expect(seconds.get(USER)).toBe(400);
  });

  it("is safe to retry after the audit-row write fails", async () => {
    const realSql = sqlMode;
    sqlMode = "throw-on-insert";
    await expect(payment()).rejects.toThrow("neon down");
    expect(seconds.get(USER)).toBe(200);
    expect(rows.size).toBe(0);

    sqlMode = realSql;
    await payment();
    expect(seconds.get(USER)).toBe(200);
    expect(rows.size).toBe(1);
  });

  it("credits ONCE even if the audit row is missing entirely", async () => {
    await payment();
    rows.clear();
    await payment();
    expect(seconds.get(USER)).toBe(200);
  });

  it("ignores a payment it cannot attribute to a user", async () => {
    await payment({ userId: undefined, customerId: null });
    expect(seconds.get(USER)).toBeUndefined();
    expect(rows.size).toBe(0);
  });
});

describe("refund", () => {
  const refund = (over: Record<string, unknown> = {}) =>
    reverseTopupFromWebhook({
      eventKey: "refund.succeeded:ref_1",
      eventType: "refund.succeeded",
      userId: USER,
      paymentId: PAYMENT,
      customerId: "cus_1",
      ...over,
    });

  it("reverses exactly what the original payment granted", async () => {
    await payment();
    await refund();
    expect(seconds.get(USER)).toBe(0);
  });

  it("reverses ONCE when the refund is redelivered", async () => {
    await payment();
    await refund();
    await refund();
    expect(seconds.get(USER)).toBe(0);
  });

  it("does nothing for a refund of a payment that was not a top-up", async () => {
    await refund({ paymentId: "pay_subscription" });
    expect(seconds.get(USER)).toBeUndefined();
  });

  it("floors at zero when the seconds were already rendered", async () => {
    await payment();
    seconds.set(USER, 100);
    await refund();
    expect(seconds.get(USER)).toBe(0);
  });
});

describe("refund edge cases the first pass got wrong", () => {
  const refund = (over: Record<string, unknown> = {}) =>
    reverseTopupFromWebhook({
      eventKey: "refund.succeeded:ref_x",
      eventType: "refund.succeeded",
      userId: USER,
      paymentId: PAYMENT,
      customerId: "cus_1",
      ...over,
    });

  it("does NOT claw back the whole grant on a partial refund", async () => {
    await payment();
    await refund({ isPartial: true });
    expect(seconds.get(USER)).toBe(200);
  });

  it("a SECOND, DIFFERENT refund on the same payment does not reverse again", async () => {
    await payment();
    await refund({ eventKey: "refund.succeeded:ref_1" });
    expect(seconds.get(USER)).toBe(0);
    seconds.set(USER, 200);
    await refund({ eventKey: "refund.succeeded:ref_2" });
    expect(seconds.get(USER)).toBe(200);
  });
});

describe("plan grant", () => {
  const grant = (over: Record<string, unknown> = {}) =>
    grantPlanFromWebhook({
      eventKey: "subscription.active:sub_1:prod:0",
      eventType: "subscription.active",
      userId: USER,
      productId: ENTERPRISE_PRODUCT_ID,
      providerRef: "sub_1",
      customerId: "cus_1",
      ...over,
    });

  it("grants enterprise for the enterprise product", async () => {
    await grant();
    const planService = await import("@/lib/users/planService");
    expect(planService.setUserPlan).toHaveBeenCalledWith(USER, "enterprise");
  });

  it("maps the enterprise product id to the enterprise plan", () => {
    expect(planForProductId(ENTERPRISE_PRODUCT_ID)).toBe("enterprise");
    expect(planForProductId(TOPUP_PRODUCT_ID)).toBeNull();
  });

  it("grants enterprise ONCE for a redelivered event", async () => {
    await grant();
    await grant();
    const planService = await import("@/lib/users/planService");
    expect(vi.mocked(planService.setUserPlan).mock.calls.filter((c) => c[1] === "enterprise")).toHaveLength(1);
    expect(rows.size).toBe(1);
  });

  it("grants enterprise from a one-time payment.succeeded too", async () => {
    await grant({
      eventKey: "payment.succeeded:pay_ent",
      eventType: "payment.succeeded",
      providerRef: "pay_ent",
    });
    const planService = await import("@/lib/users/planService");
    expect(planService.setUserPlan).toHaveBeenCalledWith(USER, "enterprise");
    expect([...rows.values()].every((r) => r.topup_seconds == null)).toBe(true);
    expect(seconds.get(USER)).toBeUndefined();
  });

  it("does not grant a plan for the top-up product", async () => {
    await grant({ productId: TOPUP_PRODUCT_ID, eventKey: "payment.succeeded:pay_topup" });
    const planService = await import("@/lib/users/planService");
    expect(planService.setUserPlan).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });
});
