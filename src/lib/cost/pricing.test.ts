import { describe, it, expect } from "vitest";
import {
  estimateCostUsd,
  cinematicSecondsFor,
  veoSecondsFor,
  heygenSecondsFor,
  talkingProviderFor,
  heygenRatePerSecond,
  SERVICE_COSTS,
} from "./pricing";


const IMAGES_ASSUMED = 3;
const BUFFER = (() => {
  const a = estimateCostUsd({ durationSeconds: 10, stockImagesOnly: true });
  const b = estimateCostUsd({ durationSeconds: 20, stockImagesOnly: true });
  return (b - a) / (10 * SERVICE_COSTS.TTS_PER_SECOND);
})();

describe("estimateCostUsd — image provenance", () => {
  it("recovers the documented 1.1 buffer", () => {
    expect(BUFFER).toBeCloseTo(1.1, 10);
  });

  it("skips the image term entirely when stock-only", () => {
    const oneSecond = estimateCostUsd({ durationSeconds: 1, stockImagesOnly: true });
    const fixedLlm = oneSecond / BUFFER - SERVICE_COSTS.TTS_PER_SECOND;

    const stock = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true });
    expect(stock).toBeCloseTo((fixedLlm + 30 * SERVICE_COSTS.TTS_PER_SECOND) * BUFFER, 9);
  });

  it("includes 3 x DALLE_PER_IMAGE when not stock-only", () => {
    const stock = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true });
    const paid = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: false });
    expect(paid - stock).toBeCloseTo(IMAGES_ASSUMED * SERVICE_COSTS.DALLE_PER_IMAGE * BUFFER, 6);
  });

  it("defaults to including images when the flag is omitted", () => {
    const omitted = estimateCostUsd({ durationSeconds: 30 });
    const explicit = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: false });
    expect(omitted).toBe(explicit);
  });

  it("applies the buffer in both branches", () => {
    for (const stockImagesOnly of [true, false]) {
      const a = estimateCostUsd({ durationSeconds: 10, stockImagesOnly });
      const b = estimateCostUsd({ durationSeconds: 40, stockImagesOnly });
      expect((b - a) / (30 * SERVICE_COSTS.TTS_PER_SECOND)).toBeCloseTo(BUFFER, 10);
    }
  });

  it("does not apply the image flag to the cinematic path", () => {
    const a = estimateCostUsd({ mode: "talking_object", durationSeconds: 30, stockImagesOnly: true });
    const b = estimateCostUsd({ mode: "talking_object", durationSeconds: 30, stockImagesOnly: false });
    expect(a).toBe(b);
  });
});

describe("estimateCostUsd — regression guards", () => {
  it("a free 20s render reserves under $0.10", () => {
    const reserved = estimateCostUsd({ durationSeconds: 20, stockImagesOnly: true });
    expect(reserved).toBeLessThan(0.1);
  });

  it("still reserves enough for a free render to fit the ceiling more than once", () => {
    const FREE_CEILING = 0.6;
    const reserved = estimateCostUsd({ durationSeconds: 20, stockImagesOnly: true });
    expect(Math.floor(FREE_CEILING / reserved)).toBeGreaterThanOrEqual(2);
  });

  it("a 60s cinematic render still dominates everything else", () => {
    const cinematic = estimateCostUsd({ mode: "talking_object", durationSeconds: 60 });
    const slideshow = estimateCostUsd({ durationSeconds: 60, stockImagesOnly: true });
    expect(cinematic).toBeGreaterThan(20);
    expect(cinematic / slideshow).toBeGreaterThan(50);
  });

  it("multiplies by variationCount, capped at 5", () => {
    const one = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true, variationCount: 1 });
    const three = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true, variationCount: 3 });
    const nine = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true, variationCount: 9 });
    const five = estimateCostUsd({ durationSeconds: 30, stockImagesOnly: true, variationCount: 5 });
    expect(three).toBeGreaterThan(one);
    expect(nine).toBe(five);
  });

  it("bills Veo in whole 8-second chunks", () => {
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 9 })).toBe(16);
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 8 })).toBe(8);
    expect(cinematicSecondsFor({ durationSeconds: 60 })).toBe(0);
  });
});

describe("provider split: HeyGen must not charge Veo seconds", () => {
  const REAL_AVATAR = {
    mode: "talking_object" as const,
    talkingObjectStyle: "real" as const,
    talkingRealMode: "studio",
    durationSeconds: 30,
  };

  it("routes a real+preset-avatar render to HeyGen", () => {
    expect(
      talkingProviderFor({ ...REAL_AVATAR, avatar: { mode: "preset", presetId: "presenter_female_1" } })
    ).toBe("heygen");
  });

  it("routes a real+uploaded-avatar render to HeyGen", () => {
    expect(
      talkingProviderFor({ ...REAL_AVATAR, avatar: { mode: "upload", uploadAssetId: "asset-1" } })
    ).toBe("heygen");
  });

  it("routes cartoon, scenario, default-avatar and unknown presets to Veo", () => {
    expect(talkingProviderFor({ mode: "talking_object", talkingObjectStyle: "cartoon" })).toBe("veo");
    expect(
      talkingProviderFor({ ...REAL_AVATAR, talkingRealMode: "scenario", avatar: { mode: "preset", presetId: "presenter_female_1" } })
    ).toBe("veo");
    expect(talkingProviderFor({ ...REAL_AVATAR, avatar: { mode: "default" } })).toBe("veo");
    expect(
      talkingProviderFor({ ...REAL_AVATAR, avatar: { mode: "preset", presetId: "no_such_preset" } })
    ).toBe("veo");
  });

  it("slideshow has no talking provider and no cinematic seconds", () => {
    expect(talkingProviderFor({ mode: "slideshow", durationSeconds: 60 })).toBeNull();
    expect(cinematicSecondsFor({ mode: "slideshow", durationSeconds: 60 })).toBe(0);
  });

  it("charges a HeyGen render ZERO Veo seconds", () => {
    const heygen = { ...REAL_AVATAR, avatar: { mode: "upload", uploadAssetId: "a" } };
    expect(veoSecondsFor(heygen)).toBe(0);
    expect(heygenSecondsFor(heygen)).toBe(30);
    expect(cinematicSecondsFor(heygen)).toBe(30);
  });

  it("charges an equivalent Veo render in whole 8-second blocks", () => {
    const veo = { ...REAL_AVATAR, avatar: { mode: "default" } };
    expect(veoSecondsFor(veo)).toBe(32);
    expect(heygenSecondsFor(veo)).toBe(0);
    expect(cinematicSecondsFor(veo)).toBe(32);
  });

  it("a 60s Veo render costs 64 seconds of a 90-second allowance", () => {
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 60 })).toBe(64);
  });

  it("multiplies both providers by variationCount", () => {
    expect(cinematicSecondsFor({ mode: "talking_object", durationSeconds: 30, variationCount: 3 })).toBe(96);
    expect(
      cinematicSecondsFor({ ...REAL_AVATAR, avatar: { mode: "upload", uploadAssetId: "a" }, variationCount: 3 })
    ).toBe(90);
  });

  it("does not price HeyGen at Veo's rate", () => {
    const heygen = { ...REAL_AVATAR, avatar: { mode: "upload", uploadAssetId: "a" } };
    const veo = { ...REAL_AVATAR, avatar: { mode: "default" } };
    expect(estimateCostUsd(veo)).toBeGreaterThan(12);
    expect(estimateCostUsd(heygen)).toBeLessThan(1);
  });

  it("heygenRatePerSecond is zero, not a guess, while the rate is unknown", () => {
    delete process.env.COST_PER_HEYGEN_SECOND;
    expect(heygenRatePerSecond()).toBe(0);
    expect(heygenRatePerSecond()).not.toBe(SERVICE_COSTS.VEO_PER_SECOND);
  });
});
