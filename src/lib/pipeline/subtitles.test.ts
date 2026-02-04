import { describe, it, expect } from "vitest";
import { generateSubtitles } from "./subtitles";
import type { Script, ShotList } from "@/lib/types";

describe("generateSubtitles", () => {
  it("returns chunks array with startMs, endMs, text; total time roughly consistent with shot durations", () => {
    const script: Script = {
      entries: [
        { shotId: "s1", text: "Hello world. How are you?", order: 0 },
        { shotId: "s2", text: "I am fine.", order: 1 },
        { shotId: "s3", text: null, order: 2 },
      ],
    };
    const shotList: ShotList = {
      shots: [
        { id: "s1", beatId: "b1", durationSeconds: 5, purpose: "establish", motionType: "static", emotionalIntent: "neutral", textDensity: 1, order: 0 },
        { id: "s2", beatId: "b2", durationSeconds: 3, purpose: "hold", motionType: "static", emotionalIntent: "neutral", textDensity: 1, order: 1 },
        { id: "s3", beatId: "b3", durationSeconds: 2, purpose: "hold", motionType: "static", emotionalIntent: "neutral", textDensity: 0, order: 2 },
      ],
      totalDurationSeconds: 10,
    };

    const result = generateSubtitles(script, shotList);

    expect(result).toHaveProperty("chunks");
    expect(Array.isArray(result.chunks)).toBe(true);

    for (const chunk of result.chunks) {
      expect(chunk).toHaveProperty("startMs");
      expect(chunk).toHaveProperty("endMs");
      expect(chunk).toHaveProperty("text");
      expect(typeof chunk.startMs).toBe("number");
      expect(typeof chunk.endMs).toBe("number");
      expect(chunk.endMs >= chunk.startMs).toBe(true);
    }

    const totalDurationMs = 10 * 1000;
    if (result.chunks.length > 0) {
      const lastEnd = Math.max(...result.chunks.map((c) => c.endMs));
      expect(lastEnd).toBeLessThanOrEqual(totalDurationMs + 500);
      expect(lastEnd).toBeGreaterThan(0);
    }
  });
});
