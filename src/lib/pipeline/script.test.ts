import { describe, it, expect, vi, afterEach } from "vitest";
import { parseAndValidateScript, extendScript, generateScript, insertBeforeClosingLine } from "./script";
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
    vi.stubEnv("ANTHROPIC_API_KEY", "");
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

describe("the script fits the chosen length without cutting a line", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function captureRequests(content: string): Array<{ messages: Array<{ role: string; content: string }> }> {
    const bodies: Array<{ messages: Array<{ role: string; content: string }> }> = [];
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        bodies.push(JSON.parse(init.body));
        return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
      })
    );
    return bodies;
  }

  it("keeps a long closing line whole instead of cutting it to five words", () => {
    const script = parseAndValidateScript(
      modelOutput(["Hello there.", "Switch to automated invoicing today and see the difference."]),
      shotList
    );
    expect(script.entries[1]!.text).toBe("Switch to automated invoicing today and see the difference.");
  });

  it("asks the model for a word budget per shot, at every length the user can pick", async () => {
    const bodies = captureRequests(modelOutput(["Coffee, done right.", "Try it today!"]));
    await generateScript(intent, { arc: "hook-build-payoff", beats: [], totalDurationSeconds: 10, rationale: "r" }, shotList, {
      durationSeconds: 10,
    });
    const system = bodies[0]!.messages.find((m) => m.role === "system")!.content;
    const user = bodies[0]!.messages.find((m) => m.role === "user")!.content;
    expect(system).toContain("must come to about 20 words");
    expect(system).not.toContain("2.5 words per second");
    const shots = (JSON.parse(user.slice(0, user.indexOf("\n\nCRITICAL"))) as { shotList: ShotList }).shotList.shots;
    expect(shots.map((s) => (s as { maxWords?: number }).maxWords)).toEqual([10, 10]);
    expect(user).toContain("Each entry's text must have no more words than its shot's maxWords.");
  });

  it("gives a talking video, which ends with its narration, the whole length to speak", async () => {
    const bodies = captureRequests(modelOutput(["Coffee, done right.", "Try it today!"]));
    await generateScript(intent, { arc: "hook-build-payoff", beats: [], totalDurationSeconds: 10, rationale: "r" }, shotList, {
      durationSeconds: 10,
      mode: "talking_object",
    });
    const system = bodies[0]!.messages.find((m) => m.role === "system")!.content;
    expect(system).toContain("must come to about 23 words");
  });

  it("budgets a script at the pace it will be read", async () => {
    const bodies = captureRequests(modelOutput(["Coffee, done right.", "Try it today!"]));
    await generateScript(intent, { arc: "hook-build-payoff", beats: [], totalDurationSeconds: 10, rationale: "r" }, shotList, {
      durationSeconds: 10,
      mode: "talking_object",
      wordsPerSecond: 2.6,
    });
    const system = bodies[0]!.messages.find((m) => m.role === "system")!.content;
    expect(system).toContain("read at about 2.6 words per second");
    expect(system).toContain("must come to about 26 words");
  });

  it("budgets a Veo script at what its clips can say, whatever the length chosen", async () => {
    for (const [chunks, about, perLine, clips] of [
      [1, 18, [9, 9], "the video is one clip of 8 seconds, with room for about 18 spoken words"],
      [2, 36, [18, 18], "the video is made of 2 clips of 8 seconds, each with room for about 18 spoken words"],
    ] as const) {
      const bodies = captureRequests(modelOutput(["Coffee, done right.", "Try it today!"]));
      await generateScript(intent, { arc: "hook-build-payoff", beats: [], totalDurationSeconds: 15, rationale: "r" }, shotList, {
        durationSeconds: 15,
        mode: "talking_object",
        veoChunkCount: chunks,
      });
      const system = bodies[0]!.messages.find((m) => m.role === "system")!.content;
      const user = bodies[0]!.messages.find((m) => m.role === "user")!.content;
      expect(system).toContain(clips);
      expect(system).toContain(`must come to about ${about} words`);
      expect(system).toContain("Consecutive lines are said together in one clip");
      expect(system).not.toContain("words per second");
      const shots = (JSON.parse(user.slice(0, user.indexOf("\n\n"))) as { shotList: ShotList }).shotList.shots;
      expect(shots.map((s) => (s as { maxWords?: number }).maxWords)).toEqual(perLine);
    }
  });

  it("asks for exactly the missing words when told to, and still pads the request otherwise", async () => {
    const bodies = captureRequests("It ships free.");
    await extendScript("Hello.", intent, 12, { exactWords: true });
    await extendScript("Hello.", intent, 12);
    const asks = bodies.map((b) => b.messages.find((m) => m.role === "user")!.content);
    expect(asks[0]).toContain("Write approximately 12 words of NEW dialogue");
    expect(asks[1]).toContain("Write approximately 52 words of NEW dialogue");
  });

  it("adds extension lines before the closing line, so the sign-off is still said last", () => {
    const script = {
      entries: [
        { shotId: "s1", text: "Coffee, done right.", order: 1 },
        { shotId: "s2", text: "Try it today!", order: 2 },
        { shotId: "s3", text: null, order: 3 },
      ],
    };
    expect(insertBeforeClosingLine(script, "Roasted this week. Shipped tomorrow.").entries.map((e) => e.text)).toEqual([
      "Coffee, done right. Roasted this week. Shipped tomorrow.",
      "Try it today!",
      null,
    ]);
    expect(script.entries[0]!.text).toBe("Coffee, done right.");
    const single = { entries: [{ shotId: "s1", text: "Try it today!", order: 1 }] };
    expect(insertBeforeClosingLine(single, "Roasted this week.").entries[0]!.text).toBe(
      "Roasted this week. Try it today!"
    );
  });
});
