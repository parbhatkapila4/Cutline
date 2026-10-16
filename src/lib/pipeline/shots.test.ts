import { describe, it, expect, vi, afterEach } from "vitest";
import { getShotCountRange, planShots } from "./shots";
import type { Intent, NarrativePlan } from "@/lib/types";

const intent: Intent = {
  audience: "broad",
  goal: "persuade",
  tone: "serious",
  complexity: "simple",
  durationSeconds: 10,
  rawInput: "Why small businesses should automate invoicing",
};

const plan: NarrativePlan = {
  arc: "problem-solution-cta",
  beats: [
    { id: "beat-1", purpose: "hook attention", durationSeconds: 4, pacing: "fast" },
    { id: "beat-2", purpose: "present solution", durationSeconds: 4, pacing: "steady" },
    { id: "beat-3", purpose: "call to action", durationSeconds: 2, pacing: "fast" },
  ],
  totalDurationSeconds: 10,
  rationale: "r",
};

describe("getShotCountRange", () => {
  it("gives a short video no more shots than three seconds each allows", () => {
    expect(getShotCountRange(3, 10)).toEqual({ min: 3, max: 3 });
    expect(getShotCountRange(4, 15)).toEqual({ min: 4, max: 5 });
    expect(getShotCountRange(8, 30)).toEqual({ min: 8, max: 10 });
  });

  it("leaves longer videos the per-beat range, and never asks for fewer shots than beats", () => {
    expect(getShotCountRange(6, 60)).toEqual({ min: 6, max: 18 });
    expect(getShotCountRange(4, 10)).toEqual({ min: 4, max: 4 });
    expect(getShotCountRange(3)).toEqual({ min: 3, max: 9 });
  });
});

describe("planShots on a 10 s video", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks for exactly three shots and merges any extra the model returns, keeping each beat's seconds", async () => {
    const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    const shots = [
      ["beat-1", 1], ["beat-1", 2], ["beat-1", 1],
      ["beat-2", 2], ["beat-2", 1], ["beat-2", 1],
      ["beat-3", 1], ["beat-3", 1],
    ].map(([beatId, durationSeconds], i) => ({
      id: `shot-${i + 1}`,
      beatId,
      durationSeconds,
      purpose: "reveal",
      motionType: "push",
      emotionalIntent: "neutral",
      textDensity: 2,
      order: i + 1,
    }));
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(JSON.parse(init.body));
        const content = JSON.stringify({ shots, totalDurationSeconds: 10 });
        return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
      })
    );

    const list = await planShots(intent, plan);

    expect(bodies[0]!.messages[0]!.content).toContain("shots: array of exactly 3 shot objects");
    expect(list.shots.map((s) => [s.beatId, s.durationSeconds])).toEqual([
      ["beat-1", 4],
      ["beat-2", 4],
      ["beat-3", 2],
    ]);
    expect(list.totalDurationSeconds).toBe(10);
  });
});
