import { describe, it, expect } from "vitest";
import { countPaidImageCalls, createCostTracker } from "./costEstimator";
import { SERVICE_COSTS } from "./pricing";
import type { ImageSpecEntry } from "@/lib/images/types";

const FALLBACK_IMAGE_PATH = "/fallback.png";

function entry(
  shotId: string,
  source: ImageSpecEntry["source"],
  over: Partial<ImageSpecEntry> = {}
): ImageSpecEntry {
  return {
    shotId,
    imageUrl: `https://example.test/${shotId}.jpg`,
    source,
    fallbackUsed: false,
    ...over,
  };
}

describe("countPaidImageCalls", () => {
  it("books zero for an all-stock job", () => {
    const entries = [
      entry("s1", "stock"),
      entry("s2", "stock"),
      entry("s3", "stock"),
      entry("s4", "stock"),
    ];
    expect(countPaidImageCalls(entries)).toBe(0);
  });

  it("counts only the ai-generated entries in a mixed job", () => {
    const entries = [
      entry("s1", "stock"),
      entry("s2", "ai-generated", { fallbackUsed: true }),
      entry("s3", "user"),
      entry("s4", "stock"),
      entry("s5", "ai-generated", { fallbackUsed: true }),
      entry("s6", "stock"),
    ];
    expect(countPaidImageCalls(entries)).toBe(2);
  });

  it("books zero for an all-placeholder job", () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry(`s${i + 1}`, "stock", {
        imageUrl: FALLBACK_IMAGE_PATH,
        fallbackUsed: true,
      })
    );
    expect(countPaidImageCalls(entries)).toBe(0);
  });

  it("does not count user uploads", () => {
    const entries = [entry("s1", "user"), entry("s2", "user")];
    expect(countPaidImageCalls(entries)).toBe(0);
  });

  it("survives an empty or absent spec", () => {
    expect(countPaidImageCalls([])).toBe(0);
    expect(countPaidImageCalls(undefined)).toBe(0);
    expect(countPaidImageCalls(null)).toBe(0);
  });
});

describe("image cost booked through the tracker", () => {
  it("charges nothing for a stock-only job", () => {
    const t = createCostTracker();
    t.recordImageCalls(countPaidImageCalls([entry("s1", "stock"), entry("s2", "stock")]));
    expect(t.getBreakdown().images).toBe(0);
  });

  it("charges the DALL-E rate per generated image only", () => {
    const entries = [
      entry("s1", "stock"),
      entry("s2", "ai-generated"),
      entry("s3", "ai-generated"),
    ];
    const t = createCostTracker();
    t.recordImageCalls(countPaidImageCalls(entries));
    expect(t.getBreakdown().images).toBeCloseTo(2 * SERVICE_COSTS.DALLE_PER_IMAGE, 6);
  });

  it("is the regression guard: 8 stock shots must not cost 8 generations", () => {
    const stockOnly = Array.from({ length: 8 }, (_, i) => entry(`s${i + 1}`, "stock"));
    const t = createCostTracker();
    t.recordImageCalls(countPaidImageCalls(stockOnly));
    const naive = createCostTracker();
    naive.recordImageCalls(stockOnly.length);

    expect(t.getBreakdown().images).toBe(0);
    expect(naive.getBreakdown().images).toBeCloseTo(8 * SERVICE_COSTS.DALLE_PER_IMAGE, 6);
  });
});

describe("Veo is booked per generation attempt, not per delivered second", () => {
  it("books a whole 8-second block per call, including rerolls and dropped chunks", () => {
    const t = createCostTracker();
    for (let i = 0; i < 6; i++) t.recordVeoChunks(1);
    expect(t.getBreakdown().video).toBeCloseTo(19.2, 4);
  });

  it("no longer undercounts a job whose output is shorter than what it bought", () => {
    const bought = createCostTracker();
    bought.recordVeoChunks(4);
    const delivered = 30.2 * SERVICE_COSTS.VEO_PER_SECOND;
    expect(bought.getBreakdown().video).toBeGreaterThan(delivered);
  });

  it("books HeyGen seconds at HeyGen's rate, which is zero while unknown", () => {
    delete process.env.COST_PER_HEYGEN_SECOND;
    const t = createCostTracker();
    t.recordHeygenSeconds(30);
    expect(t.getBreakdown().video).toBe(0);
  });

  it("honours COST_PER_HEYGEN_SECOND once a real rate is known", () => {
    process.env.COST_PER_HEYGEN_SECOND = "0.05";
    try {
      const t = createCostTracker();
      t.recordHeygenSeconds(30);
      expect(t.getBreakdown().video).toBeCloseTo(1.5, 4);
    } finally {
      delete process.env.COST_PER_HEYGEN_SECOND;
    }
  });

  it("keeps the two vendors additive rather than sharing one rate", () => {
    process.env.COST_PER_HEYGEN_SECOND = "0.05";
    try {
      const t = createCostTracker();
      t.recordVeoChunks(1);
      t.recordHeygenSeconds(10);
      expect(t.getBreakdown().video).toBeCloseTo(8 * 0.4 + 10 * 0.05, 4);
    } finally {
      delete process.env.COST_PER_HEYGEN_SECOND;
    }
  });
});
