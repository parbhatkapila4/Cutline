import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Script, ShotList } from "@/lib/types";
import type { GenerateScriptOptions } from "./script";
import type { RenderInput } from "./renderVideo";

const mocks = vi.hoisted(() => ({
  shotList: null as unknown,
  script: null as unknown,
  scriptOptions: [] as Array<GenerateScriptOptions | undefined>,
  tts: null as unknown,
  ttsScripts: [] as Script[],
  extension: "",
  renders: [] as RenderInput[],
  trims: [] as number[],
  extendCalls: [] as unknown[][],
  talking: [] as unknown[][],
  veoPrompts: [] as string[],
  burned: [] as Array<Array<{ text: string; endMs: number }>>,
  outputSeconds: 0,
}));

vi.mock("@/lib/pipeline/intent", () => ({
  interpretIntent: async () => ({
    audience: "broad",
    goal: "persuade",
    tone: "serious",
    complexity: "simple",
    durationSeconds: 30,
    rawInput: "Why small businesses should automate invoicing",
  }),
}));
vi.mock("@/lib/pipeline/narrative", () => ({
  planNarrative: async () => ({ arc: "problem-solution-cta", beats: [], totalDurationSeconds: 30, rationale: "r" }),
}));
vi.mock("@/lib/pipeline/shots", () => ({ planShots: async () => structuredClone(mocks.shotList) }));
vi.mock("@/lib/pipeline/script", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./script")>()),
  generateScript: async (...args: unknown[]) => {
    mocks.scriptOptions.push(args[3] as GenerateScriptOptions | undefined);
    return structuredClone(mocks.script);
  },
  extendScript: async (...args: unknown[]) => {
    mocks.extendCalls.push(args);
    return mocks.extension;
  },
}));
vi.mock("@/lib/pipeline/tts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tts")>()),
  generateTTS: async (script: Script) => {
    mocks.ttsScripts.push(structuredClone(script));
    return mocks.tts;
  },
}));
vi.mock("@/lib/images/source", () => ({
  sourceImages: async () => ({ entries: [] }),
  normalizeImageSpecForRender: (spec: unknown) => spec,
}));
vi.mock("@/lib/pipeline/renderVideo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./renderVideo")>()),
  runRemotionRender: async (input: RenderInput) => {
    mocks.renders.push(input);
  },
}));
vi.mock("@/lib/pipeline/concatMp4", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./concatMp4")>();
  return {
    ...orig,
    trimVideoIfLongerThan: (_path: string, maxDurationSec: number) => {
      mocks.trims.push(maxDurationSec);
    },
    getDuration: (filePath: string) => (mocks.outputSeconds > 0 ? mocks.outputSeconds : orig.getDuration(filePath)),
    isFfmpegAvailable: () => true,
    trimChunkSilence: () => { },
    concatenateMp4s: () => { },
    mixBackgroundMusic: () => { },
  };
});
vi.mock("@/lib/lipsync/heygen", () => ({
  createTalkingVideo: async (...args: unknown[]) => {
    mocks.talking.push(args);
  },
}));
vi.mock("@/lib/veo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/veo")>()),
  generateTalkingVideoWithVeo: async (prompt: string) => {
    mocks.veoPrompts.push(prompt);
  },
}));
vi.mock("@/lib/pipeline/validateChunk", () => ({ validateVideoChunk: () => ({ valid: true }) }));
vi.mock("@/lib/pipeline/burnSubtitles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./burnSubtitles")>()),
  burnSubtitlesIntoVideo: (_path: string, entries: Array<{ text: string; endMs: number }>) => {
    mocks.burned.push(entries);
  },
}));
vi.mock("@/lib/queue/cancelCheck", () => ({
  isJobCancelled: async () => false,
  withCancellationWatch: <T>(_jobId: string, run: (signal: AbortSignal) => Promise<T>) =>
    run(new AbortController().signal),
}));
vi.mock("@/lib/regen/snapshotStore", () => ({ saveRegenSnapshot: async () => { } }));
vi.mock("@/lib/storage/cleanup", () => ({ cleanupJobArtifacts: async () => { } }));
vi.mock("@/lib/telemetry/renderEvents", () => ({ recordRenderEvent: () => { } }));
vi.mock("@/lib/utils/pipelineLogger", () => ({ logPipelineEvent: () => { } }));

import { runPipeline } from "./orchestrator";

const PLAN: Array<[number, 0 | 1 | 2 | 3]> = [
  [5, 2], [3, 2], [3, 2], [2, 0], [3, 2], [3, 2], [3, 2], [2, 1], [2, 2], [1, 0], [2, 2], [1, 0],
];
const SEGMENTS_MS = [8283.5, 8335.75, 5174.875, 2000, 8753.6875, 6533.25, 8335.75, 2536.5625, 6899, 1000, 8231.25, 1000];
const NARRATION_MS = 63084;
const LINES: Array<string | null> = [
  "Manual invoicing is costing your business more than you realize, with hours spent on data entry, tracking, and follow-ups every single week.",
  "Small businesses lose thousands annually to late payments, billing errors, and the administrative overhead of managing invoices by hand.",
  "Your team could be focused on growth instead of drowning in spreadsheets and payment reminders.",
  null,
  "Automated invoicing software eliminates these inefficiencies by generating, sending, and tracking invoices instantly with zero manual intervention.",
  "You'll recover hours every week that your team can redirect toward actual business development and customer relationships.",
  "Automation ensures accuracy, reduces payment delays, and gives you real-time visibility into your cash flow and outstanding receivables.",
  "Better cash flow means better decisions.",
  "Modern invoicing platforms integrate seamlessly with your existing tools and require minimal technical setup to get running.",
  null,
  "Stop wasting time on manual processes, switch to automated invoicing today, and watch your efficiency and profitability grow.",
  null,
];

function planOf(plan: Array<[number, 0 | 1 | 2 | 3]>): ShotList {
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

function scriptOf(lines: Array<string | null>): Script {
  return { entries: lines.map((text, i) => ({ shotId: `shot-${i + 1}`, text, order: i + 1 })) };
}

function run(durationSeconds: number) {
  return runPipeline({
    input: "Why small businesses should automate invoicing",
    jobId: "narration-length-test",
    mode: "slideshow",
    durationSeconds,
    captions: "on",
    aspectRatio: "9:16",
    resolvedAssets: new Map(),
  });
}

function runHeygen(durationSeconds: number) {
  return runPipeline({
    input: "Why small businesses should automate invoicing",
    jobId: "narration-length-heygen-test",
    mode: "talking_object",
    talkingObjectStyle: "real",
    avatar: { mode: "preset", presetId: "presenter_female_1" },
    durationSeconds,
    captions: "on",
    aspectRatio: "9:16",
    resolvedAssets: new Map(),
  });
}

const VEO_JOB_ID = "narration-length-veo-test";

function runVeo(durationSeconds: number) {
  return runPipeline({
    input: "Why small businesses should automate invoicing",
    jobId: VEO_JOB_ID,
    mode: "talking_object",
    talkingObjectStyle: "real",
    avatar: { mode: "default" },
    durationSeconds,
    captions: "on",
    aspectRatio: "9:16",
    resolvedAssets: new Map(),
  });
}

const wordsIn = (t: string) => t.split(/\s+/).filter(Boolean).length;

function resetMocks() {
  vi.stubEnv("ELEVENLABS_USE_MP3", "true");
  mocks.renders.length = 0;
  mocks.trims.length = 0;
  mocks.scriptOptions.length = 0;
  mocks.ttsScripts.length = 0;
  mocks.extendCalls.length = 0;
  mocks.talking.length = 0;
  mocks.veoPrompts.length = 0;
  mocks.burned.length = 0;
  mocks.outputSeconds = 0;
  mocks.extension = "";
  mocks.shotList = planOf(PLAN);
  mocks.script = scriptOf(LINES);
  mocks.tts = {
    audioBuffer: Buffer.from("mp3"),
    audioFormat: "mp3",
    durationMs: NARRATION_MS,
    segmentDurationsMs: SEGMENTS_MS,
  };
}

describe("slideshow length follows the narration", () => {
  beforeEach(resetMocks);
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders a narration that runs past the plan to its last word, then the pause, then the fade", async () => {
    await run(30);
    const render = mocks.renders[0]!;
    expect(render.durationSeconds).toBeCloseTo(63.084 + 0.5 + 1, 6);
    expect(render.shotList.totalDurationSeconds).toBe(64);
    const fadeStartsAt = render.durationSeconds! - 1;
    expect(fadeStartsAt).toBeGreaterThanOrEqual(NARRATION_MS / 1000 + 0.5);
    expect(Math.max(...render.subtitleTrack.chunks.map((c) => c.endMs))).toBeLessThanOrEqual(NARRATION_MS);
    expect(mocks.trims).toEqual([64.6]);
  });

  it("ends a narration shorter than the plan early, after the same pause", async () => {
    mocks.tts = { ...(mocks.tts as object), durationMs: 24300 };
    await run(30);
    const render = mocks.renders[0]!;
    expect(render.durationSeconds).toBeCloseTo(24.3 + 0.5 + 1, 6);
    expect(render.shotList.totalDurationSeconds).toBe(25);
  });

  it("tops up a short script before its closing line and never cuts the closing line", async () => {
    mocks.shotList = planOf([[6, 2], [6, 2], [3, 1]]);
    mocks.script = scriptOf([
      "Manual invoicing wastes hours.",
      "Automation fixes that.",
      "Switch to automated invoicing today and see the difference.",
    ]);
    mocks.extension = "It sends every invoice on time, chases late payers for you, and shows every open balance on one screen.";
    mocks.tts = { audioBuffer: Buffer.from("mp3"), audioFormat: "mp3", durationMs: 14800, segmentDurationsMs: [5200, 6100, 3500] };
    await run(15);
    expect(mocks.extendCalls).toHaveLength(1);
    expect(mocks.extendCalls[0]![2]).toBe(15);
    expect(mocks.extendCalls[0]![3]).toMatchObject({ exactWords: true });
    expect(mocks.renders[0]!.script.entries.map((e) => e.text)).toEqual([
      "Manual invoicing wastes hours.",
      "Automation fixes that. It sends every invoice on time, chases late payers for you, and shows every open balance on one screen.",
      "Switch to automated invoicing today and see the difference.",
    ]);
  });

  it("gives HeyGen the whole narration and keeps the video and its captions to the end", async () => {
    vi.stubEnv("HEYGEN_API_KEY", "test-key");
    const narration = Buffer.from("74 seconds of narration for a 60 second pick");
    mocks.tts = { audioBuffer: narration, audioFormat: "mp3", durationMs: 74000, segmentDurationsMs: SEGMENTS_MS };
    mocks.outputSeconds = 74;
    await runHeygen(60);
    expect(mocks.talking).toHaveLength(1);
    expect(mocks.talking[0]![1]).toBe(narration);
    expect(mocks.trims).toEqual([]);
    expect(Math.max(...mocks.burned[0]!.map((e) => e.endMs))).toBe(74000);
    expect(mocks.extendCalls).toEqual([]);
  });

  it("tops up a short HeyGen script to the whole length, before its closing line", async () => {
    vi.stubEnv("HEYGEN_API_KEY", "test-key");
    mocks.shotList = planOf([[8, 2], [8, 2], [4, 2]]);
    mocks.script = scriptOf([
      "Manual invoicing wastes hours every week.",
      "Automation sends, tracks and chases every invoice for you.",
      "Switch today.",
    ]);
    mocks.extension =
      "It creates each invoice from your records, sends it the moment the work is done, reminds late payers on a schedule you set, and shows you every open balance in one place, so you always know who still owes you money.";
    mocks.outputSeconds = 19.6;
    await runHeygen(20);
    expect(mocks.extendCalls).toHaveLength(1);
    expect(mocks.extendCalls[0]![2]).toBe(35);
    expect(mocks.extendCalls[0]![3]).toMatchObject({ exactWords: true });
    expect(mocks.ttsScripts[0]!.entries.map((e) => e.text)).toEqual([
      "Manual invoicing wastes hours every week.",
      "Automation sends, tracks and chases every invoice for you. " + mocks.extension,
      "Switch today.",
    ]);
    expect(mocks.talking).toHaveLength(1);
  });

  it("tops up a script that has the words of its budget but too few characters to fill its time", async () => {
    mocks.shotList = planOf([[5, 2], [5, 2], [5, 2], [5, 2], [5, 2], [5, 2]]);
    mocks.script = scriptOf([
      "You do the work, then you wait weeks to get paid.",
      "You send the bill, chase it twice, and still wait.",
      "That eats your week, and it is no way to run a shop.",
      "Let the app send each bill, track it, and nudge for you.",
      "You get paid on time, and you get your week back.",
      "Try it now.",
    ]);
    mocks.extension =
      "It sends each bill the day the job is done, it nudges slow payers for you, and it shows what is owed on one page, so you can stop chasing and get back to work.";
    mocks.tts = { audioBuffer: Buffer.from("mp3"), audioFormat: "mp3", durationMs: 27000, segmentDurationsMs: [5000, 5000, 5000, 5000, 5000, 2000] };
    await run(30);
    expect(mocks.extendCalls).toHaveLength(1);
    expect(mocks.extendCalls[0]![2]).toBe(43);
  });

  it("does not top up a script whose long words already fill its time", async () => {
    mocks.shotList = planOf([[5, 2], [5, 2], [5, 2], [5, 2], [5, 2], [5, 2]]);
    mocks.script = scriptOf([
      "Manual invoicing quietly consumes hours of administrative work every single week.",
      "Automated platforms generate, send, and reconcile every invoice instantly.",
      "Integrated reminders follow up with late customers before payments slip.",
      "Real-time dashboards show outstanding balances and incoming cashflow clearly.",
      "Businesses reclaim productive hours and eliminate repetitive bookkeeping errors.",
      "Upgrade your invoicing system today.",
    ]);
    mocks.tts = { audioBuffer: Buffer.from("mp3"), audioFormat: "mp3", durationMs: 27500, segmentDurationsMs: [5500, 5000, 5000, 5000, 5000, 2000] };
    await run(30);
    expect(mocks.extendCalls).toEqual([]);
  });
});

describe("a Veo video says every word of its script", () => {
  const FIFTEEN_SECOND_LINES = [
    "Manual invoicing eats hours every week.",
    "Every invoice is typed, sent and chased by hand, one at a time.",
    "Automated software sends each invoice the moment the work is done.",
    "Switch today.",
  ];

  beforeEach(() => {
    resetMocks();
    vi.stubEnv("VEO_SAFETY_PRECHECK", "false");
    mocks.outputSeconds = 15.4;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(path.join(process.cwd(), "public", "temp", VEO_JOB_ID), { recursive: true, force: true });
  });

  it("makes the clips admission charges for, and budgets the script at what they say: two at 10 and 15 s, four at 30, eight at 60", async () => {
    for (const [seconds, clips] of [[10, 2], [15, 2], [30, 4], [60, 8]] as const) {
      mocks.scriptOptions.length = 0;
      mocks.veoPrompts.length = 0;
      await runVeo(seconds);
      expect(mocks.scriptOptions[0]).toMatchObject({ veoChunkCount: clips });
      expect(mocks.veoPrompts).toHaveLength(clips);
    }
    await run(30);
    expect(mocks.scriptOptions.at(-1)).not.toHaveProperty("veoChunkCount");
  });

  it("plays every clip to its end, past the chosen length", async () => {
    mocks.shotList = planOf([[4, 2], [5, 2], [4, 2], [2, 2]]);
    mocks.script = scriptOf(FIFTEEN_SECOND_LINES);
    const result = await runVeo(15);
    expect(mocks.trims).toEqual([]);
    expect(Math.max(...mocks.burned[0]!.map((e) => e.endMs))).toBe(15400);
    expect(result.message).toBeUndefined();
  });

  it("shares the script across its clips, each ending where a line does, the closing line last", async () => {
    mocks.shotList = planOf([[4, 2], [5, 2], [4, 2], [2, 2]]);
    mocks.script = scriptOf(FIFTEEN_SECOND_LINES);
    await runVeo(15);
    const said = mocks.burned[0]!.map((e) => e.text);
    expect(mocks.veoPrompts).toHaveLength(2);
    said.forEach((text, i) => expect(mocks.veoPrompts[i]).toContain(text));
    expect(said).toEqual([
      "Manual invoicing eats hours every week. Every invoice is typed, sent and chased by hand, one at a time.",
      "Automated software sends each invoice the moment the work is done. Switch today.",
    ]);
    expect(said.map(wordsIn)).toEqual([19, 13]);
    expect(mocks.extendCalls).toEqual([]);
  });

  it("tops up a script too short for its clips with exactly the words they have room for, before its closing line", async () => {
    mocks.shotList = planOf([[5, 2], [5, 2], [5, 2]]);
    mocks.script = scriptOf([
      "Manual invoicing wastes hours every week.",
      "Automation sends and chases every invoice for you.",
      "Switch today.",
    ]);
    mocks.extension =
      "Errors cost you money. It builds each invoice from your records and sends it the moment the job is finished.";
    await runVeo(15);
    expect(mocks.extendCalls).toHaveLength(1);
    expect(mocks.extendCalls[0]![2]).toBe(36 - 16);
    expect(mocks.extendCalls[0]![3]).toMatchObject({ exactWords: true });
    expect(mocks.burned[0]!.map((e) => e.text)).toEqual([
      "Manual invoicing wastes hours every week. Automation sends and chases every invoice for you. Errors cost you money.",
      "It builds each invoice from your records and sends it the moment the job is finished. Switch today.",
    ]);
  });
});
