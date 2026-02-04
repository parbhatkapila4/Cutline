import { describe, it, expect } from "vitest";
import { composeVisuals } from "./visuals";
import type { Intent, ShotList } from "@/lib/types";

function minimalIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    audience: "broad",
    goal: "explain",
    tone: "serious",
    complexity: "simple",
    durationSeconds: 30,
    rawInput: "Explain something.",
    ...overrides,
  };
}

function minimalShotList(): ShotList {
  return {
    shots: [
      {
        id: "shot-1",
        beatId: "beat-1",
        durationSeconds: 10,
        purpose: "establish",
        motionType: "static",
        emotionalIntent: "neutral",
        textDensity: 1,
        order: 0,
      },
    ],
    totalDurationSeconds: 10,
  };
}

describe("composeVisuals", () => {
  it("returns expected shape (entries with colors/layout fields); no crash", () => {
    const intent = minimalIntent();
    const shotList = minimalShotList();
    const result = composeVisuals(intent, shotList);

    expect(result).toHaveProperty("entries");
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.entries.length).toBe(shotList.shots.length);

    const entry = result.entries[0];
    expect(entry).toHaveProperty("shotId");
    expect(entry).toHaveProperty("backgroundType");
    expect(entry).toHaveProperty("params");
    expect(entry).toHaveProperty("order");

    const params = entry!.params as unknown as Record<string, unknown>;
    expect(params).toBeDefined();
    expect(["color", "color1", "color2", "baseColor", "accentColor"].some((k) => k in params)).toBe(true);
  });

  it("handles different tones without crashing", () => {
    const shotList = minimalShotList();
    expect(composeVisuals(minimalIntent({ tone: "playful" }), shotList).entries.length).toBe(1);
    expect(composeVisuals(minimalIntent({ tone: "urgent" }), shotList).entries.length).toBe(1);
  });
});
