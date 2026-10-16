import { describe, it, expect } from "vitest";
import type { MotionSpec, Shot, ShotList } from "@/lib/types";
import { ENDING_FADE_SECONDS } from "@/remotion/ending";
import {
  NARRATION_CHARACTERS_PER_SECOND,
  NARRATION_TAIL_SECONDS,
  NARRATION_WORDS_PER_SECOND,
  SLIDESHOW_ENDING_SECONDS,
  TALKING_WORDS_PER_SECOND,
  compositionSecondsFor,
  endingSecondsFor,
  estimatedNarrationSeconds,
  fitShotsToLength,
  narrationSecondsFor,
  narrationWordBudget,
  splitScriptAcrossChunks,
  veoWordBudget,
} from "./narrationLength";

const PLAN: Array<[seconds: number, textDensity: Shot["textDensity"]]> = [
  [5, 2], [3, 2], [3, 2], [2, 0], [3, 2], [3, 2], [3, 2], [2, 1], [2, 2], [1, 0], [2, 2], [1, 0],
];

function shotList(plan = PLAN): ShotList {
  return {
    shots: plan.map(([durationSeconds, textDensity], i) => ({
      id: `shot-${i + 1}`,
      beatId: "beat-1",
      durationSeconds,
      purpose: "hold",
      motionType: "static",
      emotionalIntent: "neutral",
      textDensity,
      order: i + 1,
    })),
    totalDurationSeconds: plan.reduce((s, [d]) => s + d, 0),
  };
}

function motionFor(list: ShotList): MotionSpec {
  return {
    entries: list.shots.map((s) => ({
      shotId: s.id,
      motionType: "static",
      durationSeconds: s.durationSeconds,
      params: {},
      order: s.order,
    })),
  };
}

describe("narrationWordBudget", () => {
  it("budgets a 30 s plan so the narration ends before the pause and fade, split by each speaking shot's seconds", () => {
    const budget = narrationWordBudget(shotList(), 30);
    expect(budget.totalWords).toBe(66);
    expect(budget.byShotId).toEqual({
      "shot-1": 13,
      "shot-2": 8, "shot-3": 8, "shot-5": 8, "shot-6": 7, "shot-7": 7,
      "shot-8": 5, "shot-9": 5, "shot-11": 5,
    });
  });

  it("counts the slideshow's pause and fade inside the chosen length", () => {
    expect(SLIDESHOW_ENDING_SECONDS).toBe(NARRATION_TAIL_SECONDS + ENDING_FADE_SECONDS);
    expect(endingSecondsFor("slideshow")).toBe(1.5);
    expect(endingSecondsFor(undefined)).toBe(1.5);
  });

  it("gives a talking video, which has no ending, the whole length", () => {
    expect(endingSecondsFor("talking_object")).toBe(0);
    expect(narrationWordBudget(shotList(), 30, { endingSeconds: 0 }).totalWords).toBe(69);
  });

  it("budgets at the pace it is given, and says which", () => {
    expect(narrationWordBudget(shotList(), 30).wordsPerSecond).toBe(NARRATION_WORDS_PER_SECOND);
    const heygen = narrationWordBudget(shotList(), 60, { endingSeconds: 0, wordsPerSecond: TALKING_WORDS_PER_SECOND });
    expect(heygen.totalWords).toBe(156);
    expect(heygen.wordsPerSecond).toBe(2.6);
  });

  it("adds up to the budget instead of rounding each line on its own", () => {
    const plan: Array<[number, Shot["textDensity"]]> = [[5, 2], [3, 2], [3, 2], [5, 2], [4, 2], [4, 2], [3, 2], [3, 2]];
    for (const seconds of [10, 15, 30, 60]) {
      expect(narrationWordBudget(shotList(plan), seconds).totalWords).toBe(
        Math.round((seconds - SLIDESHOW_ENDING_SECONDS) * NARRATION_WORDS_PER_SECOND)
      );
    }
    expect(narrationWordBudget(shotList(plan), 30).totalWords).toBe(66);
  });

  it("leaves time for silent shots only when the TTS keeps them as silence", () => {
    expect(narrationWordBudget(shotList(), 30, { silentShotsInAudio: true }).totalWords).toBe(56);
  });

  it("never asks a speaking shot for fewer than two words", () => {
    const budget = narrationWordBudget(shotList([[9, 2], [1, 2]]), 10);
    expect(budget.byShotId["shot-2"]).toBe(2);
  });
});

describe("how long a voiceover has, and how long a script will take to read", () => {
  it("gives the voiceover the chosen length less the ending, and less the silence the TTS keeps", () => {
    expect(narrationSecondsFor(shotList(), 30)).toBe(28.5);
    expect(narrationSecondsFor(shotList(), 30, { endingSeconds: 0 })).toBe(30);
    expect(narrationSecondsFor(shotList(), 30, { silentShotsInAudio: true })).toBe(24.5);
  });

  it("estimates a voiceover's length from its characters, not its words", () => {
    const long = "Automated invoicing saves hours.";
    const short = "It is so fast.";
    expect(estimatedNarrationSeconds([long, null, ` ${long} `], NARRATION_CHARACTERS_PER_SECOND)).toBeCloseTo(64 / 16.1, 6);
    expect(estimatedNarrationSeconds([short], NARRATION_CHARACTERS_PER_SECOND)).toBeCloseTo(14 / 16.1, 6);
  });
});

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

describe("veoWordBudget", () => {
  it("budgets 18 words a clip, each clip's words shared by the run of lines it says", () => {
    const budget = veoWordBudget(shotList([[5, 2], [3, 2], [3, 2], [5, 2], [4, 2], [4, 2], [3, 2], [3, 2]]), 3);
    expect(budget.totalWords).toBe(54);
    expect(budget.veoChunks).toBe(3);
    expect(budget.byShotId).toEqual({
      "shot-1": 8, "shot-2": 5, "shot-3": 5,
      "shot-4": 10, "shot-5": 8,
      "shot-6": 7, "shot-7": 6, "shot-8": 5,
    });
  });

  it("gives a one-clip video 18 words in all, however long the chosen length", () => {
    const budget = veoWordBudget(shotList([[4, 2], [3, 2], [2, 2], [4, 2], [2, 2]]), 1);
    expect(budget.totalWords).toBe(18);
    expect(Object.values(budget.byShotId)).toEqual([5, 4, 2, 5, 2]);
  });

  it("gives a line a clip or more when there are fewer speaking shots than clips", () => {
    expect(veoWordBudget(shotList([[10, 2], [2, 0], [4, 2]]), 3).byShotId).toEqual({ "shot-1": 36, "shot-3": 18 });
  });
});

describe("splitScriptAcrossChunks", () => {
  it("ends each clip where a line ends, as evenly as the lines allow", () => {
    const lines = [
      "Invoices pile up fast.", "Chasing them steals your week.", "Errors cost you money.",
      "Automation sends every invoice the moment you finish the job.", "It reminds late payers for you.",
      "Every balance sits on one screen.", "Your cash arrives sooner.", "Switch today.",
    ];
    expect(splitScriptAcrossChunks(lines, 3)).toEqual([
      "Invoices pile up fast. Chasing them steals your week. Errors cost you money.",
      "Automation sends every invoice the moment you finish the job. It reminds late payers for you.",
      "Every balance sits on one screen. Your cash arrives sooner. Switch today.",
    ]);
  });

  const FORTY_FIVE_WORDS = [
    "Manual invoicing eats hours every week.",
    "Every invoice is typed, sent and chased by hand, one at a time.",
    "Errors slip in and payments arrive late.",
    "Automated software sends each invoice the moment the work is done.",
    "It chases late payers for you.",
    "Switch today.",
  ];

  it("says every word within the clip limit it is given, splitting a line when nothing else fits", () => {
    expect(splitScriptAcrossChunks(FORTY_FIVE_WORDS, 3, 18)).toEqual([
      "Manual invoicing eats hours every week. Every invoice is typed, sent and chased by hand",
      "one at a time. Errors slip in and payments arrive late. Automated software sends each",
      "invoice the moment the work is done. It chases late payers for you. Switch today.",
    ]);
  });

  it("lets a clip say up to 21 words so it can end where a line does", () => {
    expect(splitScriptAcrossChunks(FORTY_FIVE_WORDS, 3)).toEqual([
      "Manual invoicing eats hours every week. Every invoice is typed, sent and chased by hand, one at a time.",
      "Errors slip in and payments arrive late. Automated software sends each invoice the moment the work is done.",
      "It chases late payers for you. Switch today.",
    ]);
  });

  it("shares the excess between the clips when the script is more than they hold", () => {
    const lines = [
      "Manual invoicing is eating up your team's time every single day.",
      "Hours spent on data entry, tracking, and follow-ups.",
      "That's money and momentum you're losing right now.",
      "Automated invoicing software handles all of it instantly and accurately.",
      "Your invoices go out faster, so cash flows in sooner.",
      "Errors drop, visibility improves, and your team focuses on growth.",
      "It integrates seamlessly with your existing tools.",
      "Make the switch today.",
    ];
    const chunks = splitScriptAcrossChunks(lines, 3);
    expect(chunks.map(words)).toEqual([22, 23, 23]);
    expect(chunks.join(" ")).toBe(lines.join(" "));
  });

  it("puts the whole script in a single clip", () => {
    expect(splitScriptAcrossChunks(["Water helps you focus.", "Drink up!"], 1)).toEqual(["Water helps you focus. Drink up!"]);
  });
});

describe("compositionSecondsFor", () => {
  it("runs the composition past the plan until the narration has finished, plus a pause", () => {
    expect(compositionSecondsFor(63.084, 30)).toBeCloseTo(63.084 + NARRATION_TAIL_SECONDS, 6);
  });

  it("ends a short narration early, still with the pause before the fade", () => {
    expect(compositionSecondsFor(24.3, 30)).toBeCloseTo(24.8, 6);
  });

  it("keeps the plan, fade included, when there is no narration to measure", () => {
    expect(compositionSecondsFor(0, 30) + ENDING_FADE_SECONDS).toBe(30);
  });
});

describe("fitShotsToLength", () => {
  it("stretches the shots to a longer narration in whole seconds, each within a second of its share", () => {
    const list = shotList();
    const fitted = fitShotsToLength(list, motionFor(list), 63.584);
    const seconds = fitted.shotList.shots.map((s) => s.durationSeconds);
    expect(seconds).toEqual([11, 7, 7, 4, 7, 6, 6, 4, 4, 2, 4, 2]);
    expect(fitted.shotList.totalDurationSeconds).toBe(64);
    list.shots.forEach((s, i) => expect(Math.abs(seconds[i]! - (s.durationSeconds * 63.584) / 30)).toBeLessThan(1));
    expect(fitted.motionSpec.entries.map((e) => e.durationSeconds)).toEqual(seconds);
  });

  it("shrinks the shots to a shorter narration and keeps every shot at least a second", () => {
    const list = shotList();
    const fitted = fitShotsToLength(list, motionFor(list), 24.8);
    expect(fitted.shotList.shots.map((s) => s.durationSeconds)).toEqual([4, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1]);
    expect(fitted.shotList.totalDurationSeconds).toBe(25);
  });

  it("leaves the plan alone when the narration rounds to its length", () => {
    const list = shotList();
    const motion = motionFor(list);
    const fitted = fitShotsToLength(list, motion, 29.6);
    expect(fitted.shotList).toBe(list);
    expect(fitted.motionSpec).toBe(motion);
  });
});
