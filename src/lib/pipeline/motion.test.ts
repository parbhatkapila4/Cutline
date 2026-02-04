import { describe, it, expect } from "vitest";
import { composeMotion } from "./motion";
import type { ShotList, Shot } from "@/lib/types";

function minimalShotList(overrides: Partial<Shot> = {}): ShotList {
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
        ...overrides,
      },
    ],
    totalDurationSeconds: 10,
  };
}

describe("composeMotion", () => {
  it("returns object with entries array; each entry has shotId, motionType, params; length matches shots", () => {
    const shotList = minimalShotList({ id: "s1", order: 0, durationSeconds: 5, purpose: "establish", motionType: "push" });
    const result = composeMotion(shotList);

    expect(result).toHaveProperty("entries");
    expect(Array.isArray(result.entries)).toBe(true);
    expect(result.entries.length).toBe(shotList.shots.length);

    const entry = result.entries[0];
    expect(entry).toHaveProperty("shotId", "s1");
    expect(entry).toHaveProperty("motionType", "push");
    expect(entry).toHaveProperty("params");
    expect(typeof entry.params).toBe("object");
  });

  it("handles multiple shots and preserves order", () => {
    const shotList: ShotList = {
      shots: [
        { id: "a", beatId: "b1", durationSeconds: 3, purpose: "hold", motionType: "static", emotionalIntent: "neutral", textDensity: 0, order: 1 },
        { id: "b", beatId: "b2", durationSeconds: 5, purpose: "establish", motionType: "zoom-in", emotionalIntent: "curiosity", textDensity: 1, order: 0 },
      ],
      totalDurationSeconds: 8,
    };
    const result = composeMotion(shotList);
    expect(result.entries.length).toBe(2);
    const sorted = [...result.entries].sort((a, b) => a.order - b.order);
    expect(sorted[0]!.shotId).toBe("b");
    expect(sorted[1]!.shotId).toBe("a");
  });
});
