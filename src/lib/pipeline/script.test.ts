import { describe, it, expect, vi, afterEach } from "vitest";
import { parseAndValidateScript, extendScript, generateScript, insertBeforeClosingLine, checkExtension } from "./script";
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
    expect(asks[0]).toContain("of no more than 12 words. Use whole sentences only");
    expect(asks[1]).toContain("of no more than 52 words. Use whole sentences only");
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

describe("a top-up is checked before it joins the script", () => {
  const COMMENTARY =
    "The 1993 flyby premise has a factual problem: Mariner 2 flew past Venus in 1962, not 1993, and the sulfur-rich cloud findings came from later missions like Pioneer Venus and Venera. Since the existing script builds on that date, I should flag it rather than extend it silently. Here is a serious continuation that stays accurate: Those cloud constraints remain central to the phosphine debate today. Any detection claim must survive scrutiny against these chemical limits.";

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("lets plain narration through as it is", () => {
    expect(checkExtension("It ships free. Orders arrive in two days.", 20)).toEqual({
      valid: true,
      text: "It ships free. Orders arrive in two days.",
    });
  });

  it("rejects the reply that put the model's own commentary into a 20 second video, even with room for all of it", () => {
    expect(checkExtension(COMMENTARY, 12)).toEqual({
      valid: false,
      reason: 'it talks about the script: "the existing script"',
    });
    expect(checkExtension(COMMENTARY, 300).valid).toBe(false);
  });

  it("rejects a reply that argues with the premise before it continues", () => {
    const reply =
      "Yet the factual premise here needs correcting before the script goes further. Mariner 2 flew past Venus in 1962.";
    expect(checkExtension(reply, 40).valid).toBe(false);
    expect(checkExtension("That premise is historically mistaken, and the record should be set straight.", 40)).toEqual({
      valid: false,
      reason: 'it talks about the premise: "That premise"',
    });
  });

  it("lets a correction through when the narrator says it, because that is still dialogue", () => {
    const reply = "Einstein did not receive the 1925 prize for relativity.";
    expect(checkExtension(reply, 40)).toEqual({ valid: true, text: reply });
  });

  it("rejects a reply that announces itself or speaks as the assistant", () => {
    for (const reply of [
      "Here's a continuation that keeps the same tone. It ships free.",
      "Here is more dialogue: It ships free.",
      "I should flag that this claim is unsupported. It ships free.",
      "I'll extend it now. It ships free.",
      "I can't continue with this. It ships free.",
    ]) {
      expect(checkExtension(reply, 40).valid, reply).toBe(false);
    }
  });

  it("does not mistake a creator speaking in the first person for commentary", () => {
    for (const reply of [
      "I'll show you how it works.",
      "Here's why it matters.",
      "I should have switched years ago.",
      "I built this for teams like yours.",
      "I can't wait to show you.",
      "I can't help but love it.",
    ]) {
      expect(checkExtension(reply, 40), reply).toEqual({ valid: true, text: reply });
    }
  });

  it("rejects text that is formatted instead of spoken", () => {
    for (const reply of [
      "- It ships free.\n- It arrives in two days.",
      "1. It ships free.",
      "**Note:** It ships free.",
      '{"text": "It ships free."}',
      "# More\nIt ships free.",
    ]) {
      expect(checkExtension(reply, 40).valid, reply).toBe(false);
    }
  });

  it("keeps whole sentences up to the words allowed, and stops at the first that does not fit", () => {
    const reply =
      "It sends every invoice on time. It chases late payers for you. It shows every open balance on one screen.";
    expect(checkExtension(reply, 12)).toEqual({
      valid: true,
      text: "It sends every invoice on time. It chases late payers for you.",
    });
    expect(checkExtension(reply, 11)).toEqual({ valid: true, text: "It sends every invoice on time." });
    expect(checkExtension(reply, 5).valid).toBe(false);
  });

  it("drops a sentence the model left unfinished", () => {
    expect(checkExtension("It ships free. It also tracks every open bal", 40)).toEqual({
      valid: true,
      text: "It ships free.",
    });
    expect(checkExtension("It ships free and it also tracks", 40).valid).toBe(false);
  });

  it("finds the end of a sentence in a script that does not end it with a full stop", () => {
    const hindi = "यह हर चालान समय पर भेजता है। यह देर से भुगतान करने वालों को याद दिलाता है।";
    expect(checkExtension(hindi, 40)).toEqual({ valid: true, text: hindi });
    expect(checkExtension(hindi, 8)).toEqual({ valid: true, text: "यह हर चालान समय पर भेजता है।" });
  });

  it("does not cut a sentence at a decimal point or a version number", () => {
    const reply = "Version 2.0 ships free. Plans start at 3.5 dollars a month.";
    expect(checkExtension(reply, 40)).toEqual({ valid: true, text: reply });
  });

  it("cleans what it keeps the way every other line the model adds is cleaned", () => {
    expect(checkExtension("And that's the secret — consistency. 🚀", 20)).toEqual({
      valid: true,
      text: "And that's the secret, consistency.",
    });
  });

  it("trims an oversized top-up to the sentences that fit the ask", async () => {
    respondWith(
      "It sends every invoice on time. It chases late payers for you. It shows every open balance on one screen. It also exports to your accountant."
    );
    await expect(extendScript("Hello.", intent, 12, { exactWords: true })).resolves.toBe(
      "It sends every invoice on time. It chases late payers for you."
    );
  });

  it("lets a top-up run a few words past the ask when that is what finishes its sentence", async () => {
    respondWith("It sends every invoice on time and chases late payers. It also shows every open balance.");
    await expect(extendScript("Hello.", intent, 9, { exactWords: true })).resolves.toBe(
      "It sends every invoice on time and chases late payers."
    );
  });

  it("drops a top-up whose first sentence is longer than the ask allows", async () => {
    respondWith(
      "It sends every invoice the moment the work is done, chases late payers on a schedule you set, and shows you every open balance in one place."
    );
    await expect(extendScript("Hello.", intent, 9, { exactWords: true })).resolves.toBe("");
  });

  it("drops commentary, and logs what was wrong with it", async () => {
    respondWith(COMMENTARY);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
    await expect(extendScript("Hello.", intent, 9, { exactWords: true })).resolves.toBe("");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('it talks about the script: "the existing script" (asked for 9 words, got 76)')
    );
  });
});
