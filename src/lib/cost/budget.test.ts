import { describe, it, expect } from "vitest";
import { decideSpend, cinematicSecondsPerMonth, type BudgetState } from "./budget";
import { estimateCostUsd, estimateUnmeteredCostUsd, cinematicSecondsFor, SERVICE_COSTS } from "./pricing";

function state(over: Partial<BudgetState> = {}): BudgetState {
  const base: BudgetState = {
    plan: "professional",
    budgetUsd: 29.5,
    spentUsd: 0,
    remainingUsd: 29.5,
    fractionUsed: 0,
    cinematicSecondsAllowed: 40,
    cinematicSecondsUsed: 0,
    cinematicSecondsRemaining: 40,
    topupSecondsRemaining: 0,
    totalSecondsRemaining: 40,
  };
  return { ...base, ...over };
}

const SLIDESHOW_30S = estimateCostUsd({ mode: "slideshow", durationSeconds: 30 });

describe("cost estimates", () => {
  it("prices a Veo render far above a slideshow, which is what the meter relies on", () => {
    const cinematic = estimateCostUsd({ mode: "talking_object", durationSeconds: 60 });
    expect(SLIDESHOW_30S).toBeLessThan(1);
    expect(cinematic).toBeGreaterThan(20);
  });

  it("bills Veo in whole 8-second chunks", () => {
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 9 })).toBe(16);
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 8 })).toBe(8);
    expect(cinematicSecondsFor({ mode: "slideshow", durationSeconds: 60 })).toBe(0);
  });
});

describe("decideSpend", () => {
  it("allows a normal slideshow on a fresh month", () => {
    const d = decideSpend({
      state: state(),
      estimateUsd: SLIDESHOW_30S,
      cinematicSeconds: 0,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("allow");
  });

  it("leaves room for many standard videos, so the cap stays invisible", () => {
    expect(Math.floor(29.5 / SLIDESHOW_30S)).toBeGreaterThan(40);
  });

  it("DOWNGRADES rather than refusing when cinematic seconds are spent", () => {
    const d = decideSpend({
      state: state({ cinematicSecondsUsed: 40, cinematicSecondsRemaining: 0, totalSecondsRemaining: 0 }),
      estimateUsd: estimateCostUsd({ mode: "talking_object", durationSeconds: 16 }),
      cinematicSeconds: 16,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("downgrade");
    if (d.outcome === "downgrade") expect(d.toMode).toBe("slideshow");
  });

  it("downgrades a cinematic request that alone would blow the dollar ceiling", () => {
    const d = decideSpend({
      state: state({ spentUsd: 20, remainingUsd: 9.5 }),
      estimateUsd: estimateCostUsd({ mode: "talking_object", durationSeconds: 60 }),
      cinematicSeconds: 64,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("downgrade");
  });

  it("denies only when even the cheap fallback does not fit", () => {
    const d = decideSpend({
      state: state({ spentUsd: 29.5, remainingUsd: 0 }),
      estimateUsd: estimateCostUsd({ mode: "talking_object", durationSeconds: 60 }),
      cinematicSeconds: 64,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("deny");
  });

  it("denies a standard render once the ceiling is genuinely reached", () => {
    const d = decideSpend({
      state: state({ spentUsd: 29.5, remainingUsd: 0 }),
      estimateUsd: SLIDESHOW_30S,
      cinematicSeconds: 0,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("deny");
  });

  it("caps the worst case a single seat can cost - the actual regression guard", () => {
    const s = state();
    let spent = 0;
    let denied = false;
    for (let i = 0; i < 500 && !denied; i++) {
      const est = estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 60 });
      const cine = cinematicSecondsFor({ mode: "talking_object", durationSeconds: 60 });
      const cur = state({
        spentUsd: spent,
        remainingUsd: Math.max(0, s.budgetUsd - spent),
        cinematicSecondsUsed: 0,
        cinematicSecondsRemaining: s.cinematicSecondsAllowed,
        topupSecondsRemaining: 0,
        totalSecondsRemaining: s.cinematicSecondsAllowed,
      });
      const d = decideSpend({
        state: cur,
        estimateUsd: est,
        cinematicSeconds: cine,
        fallbackEstimateUsd: SLIDESHOW_30S,
      });
      if (d.outcome === "deny") { denied = true; break; }
      spent += d.outcome === "downgrade" ? SLIDESHOW_30S : est;
    }
    expect(spent).toBeLessThanOrEqual(29.5 + SLIDESHOW_30S);
  });

  it("bounds cinematic spend by the SECONDS meter, since the ceiling no longer does", () => {
    const allowed = cinematicSecondsPerMonth("professional");
    const worstCaseVeoUsd = allowed * SERVICE_COSTS.VEO_PER_SECOND;
    expect(worstCaseVeoUsd).toBeCloseTo(36, 4);
    const d = decideSpend({
      state: state({ cinematicSecondsAllowed: allowed, cinematicSecondsRemaining: allowed, totalSecondsRemaining: allowed }),
      estimateUsd: estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 300 }),
      cinematicSeconds: cinematicSecondsFor({ mode: "talking_object", durationSeconds: 300 }),
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("downgrade");
  });

  it("a single 60s render no longer eats the whole dollar ceiling", () => {
    const full = estimateCostUsd({ mode: "talking_object", durationSeconds: 60 });
    const unmetered = estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 60 });
    expect(full).toBeGreaterThan(28);
    expect(unmetered).toBeLessThan(0.3);
    expect(Math.floor(29.5 / unmetered)).toBeGreaterThan(100);
  });

  it("spends the perishable monthly seconds before purchased ones", () => {
    const d = decideSpend({
      state: state({ cinematicSecondsRemaining: 0, topupSecondsRemaining: 300, totalSecondsRemaining: 300 }),
      estimateUsd: estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 60 }),
      cinematicSeconds: 64,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("allow");
  });
});

describe("consolidated allowances", () => {
  it("gives Professional 90 talking-character seconds and the free tiers none", () => {
    expect(cinematicSecondsPerMonth("free")).toBe(0);
    expect(cinematicSecondsPerMonth("beginner")).toBe(0);
    expect(cinematicSecondsPerMonth("professional")).toBe(90);
  });

  it("lets a Professional seat spend its allowance down and then refuses", () => {
    const allowed = cinematicSecondsPerMonth("professional");
    expect(allowed).toBeGreaterThanOrEqual(64);
    expect(allowed).toBeLessThan(128);
  });
});

describe("balance shape the UI reads", () => {
  it("keeps purchased seconds apart from the monthly allowance", () => {
    const s = state({
      cinematicSecondsAllowed: 90,
      cinematicSecondsUsed: 64,
      cinematicSecondsRemaining: 26,
      topupSecondsRemaining: 300,
      totalSecondsRemaining: 326,
    });
    expect(s.cinematicSecondsRemaining).toBe(26);
    expect(s.topupSecondsRemaining).toBe(300);
    expect(s.totalSecondsRemaining).toBe(s.cinematicSecondsRemaining + s.topupSecondsRemaining);
  });

  it("refuses a render larger than monthly + purchased combined", () => {
    const d = decideSpend({
      state: state({ cinematicSecondsRemaining: 8, topupSecondsRemaining: 8, totalSecondsRemaining: 16 }),
      estimateUsd: estimateUnmeteredCostUsd({ mode: "talking_object", durationSeconds: 60 }),
      cinematicSeconds: 64,
      fallbackEstimateUsd: SLIDESHOW_30S,
    });
    expect(d.outcome).toBe("downgrade");
  });
});
