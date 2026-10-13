import { describe, it, expect, vi, afterEach } from "vitest";
import { parseAndValidateScript, extendScript } from "./script";
import { rewriteNarrationForSafety } from "./safetyReword";
import type { Intent, ShotList } from "@/lib/types";

const shotList: ShotList = {
  shots: [
    { id: "s1", beatId: "b1", durationSeconds: 5, purpose: "establish", motionType: "static", emotionalIntent: "neutral", textDensity: 1, order: 1 },
    { id: "s2", beatId: "b2", durationSeconds: 5, purpose: "hold", motionType: "static", emotionalIntent: "neutral", textDensity: 1, order: 2 },
  ],
  totalDurationSeconds: 10,
};

const intent: Intent = {
  audience: "broad",
  goal: "persuade",
  tone: "playful",
  complexity: "simple",
  durationSeconds: 30,
  rawInput: "Our coffee subscription",
};

function modelOutput(texts: Array<string | null>): string {
  return JSON.stringify({
    entries: texts.map((text, i) => ({ shotId: `s${i + 1}`, text, order: i + 1 })),
  });
}

describe("parseAndValidateScript cleans every line before the script is stored", () => {
  it("replaces em dashes from the model", () => {
    const script = parseAndValidateScript(
      modelOutput(["It's not just coffee — it's a ritual.", "Try it — today!"]),
      shotList
    );
    expect(script.entries.map((e) => e.text)).toEqual([
      "It's not just coffee, it's a ritual.",
      "Try it, today!",
    ]);
  });

  it("no longer counts a spaced dash as a word when it shortens the closing line", () => {
    const script = parseAndValidateScript(
      modelOutput(["Hello there.", "Try it today — right now"]),
      shotList
    );
    expect(script.entries[1]!.text).toBe("Try it today, right now");
  });

  it("accepts a strict script whose own wording uses em dashes", () => {
    const source = "Our beans are roasted daily — never stale. Order today — it ships free.";
    const script = parseAndValidateScript(
      modelOutput(["Our beans are roasted daily — never stale.", "Order today — it ships free."]),
      shotList,
      { fidelity: "strict", strictSourceText: source }
    );
    expect(script.entries.map((e) => e.text)).toEqual([
      "Our beans are roasted daily, never stale.",
      "Order today, it ships free.",
    ]);
  });

  it("still rejects a strict line that is not in the source", () => {
    expect(() =>
      parseAndValidateScript(
        modelOutput(["Our beans are roasted daily — never stale.", "Something the user never wrote."]),
        shotList,
        { fidelity: "strict", strictSourceText: "Our beans are roasted daily — never stale." }
      )
    ).toThrow(/not found verbatim/);
  });
});

describe("text the model adds after the script stage is cleaned the same way", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function respondWith(content: string): void {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
      )
    );
  }

  it("extendScript", async () => {
    respondWith("And that's the secret — consistency. 🚀");
    await expect(extendScript("Hello.", intent, 10)).resolves.toBe(
      "And that's the secret, consistency."
    );
  });

  it("rewriteNarrationForSafety", async () => {
    respondWith("“A well-known chef — loved by many — swears by it.”");
    await expect(rewriteNarrationForSafety("A famous chef swears by it.")).resolves.toBe(
      "A well-known chef, loved by many, swears by it."
    );
  });
});
