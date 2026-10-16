import type { MotionSpec, ShotList } from "@/lib/types";
import { ENDING_FADE_SECONDS } from "@/remotion/ending";

export const NARRATION_WORDS_PER_SECOND = 2.3;
export const TALKING_WORDS_PER_SECOND = 2.6;
export const NARRATION_CHARACTERS_PER_SECOND = 16.1;
export const TALKING_CHARACTERS_PER_SECOND = 17.0;
export const VEO_CHUNK_SECONDS = 8;
export const VEO_WORDS_PER_CHUNK = 18;
export const VEO_MAX_WORDS_PER_CHUNK = 21;
export const NARRATION_TAIL_SECONDS = 0.5;
export const SLIDESHOW_ENDING_SECONDS = NARRATION_TAIL_SECONDS + ENDING_FADE_SECONDS;
export const MIN_SECONDS_PER_SHOT = 3;
const MIN_WORDS_PER_LINE = 2;

export type NarrationWordBudget = {
  totalWords: number;
  byShotId: Record<string, number>;
  wordsPerSecond: number;
  veoChunks?: number;
};

export function endingSecondsFor(mode: "slideshow" | "talking_object" | undefined): number {
  return mode === "talking_object" ? 0 : SLIDESHOW_ENDING_SECONDS;
}

export function narrationSecondsFor(
  shotList: ShotList,
  durationSeconds: number,
  options: { silentShotsInAudio?: boolean; endingSeconds?: number } = {}
): number {
  const silentSec = shotList.shots.reduce((sum, s) => sum + (s.textDensity > 0 ? 0 : s.durationSeconds), 0);
  return Math.max(
    0,
    durationSeconds -
    (options.endingSeconds ?? SLIDESHOW_ENDING_SECONDS) -
    (options.silentShotsInAudio ? silentSec : 0)
  );
}
export function estimatedNarrationSeconds(lines: Array<string | null>, charactersPerSecond: number): number {
  return lines.reduce((sum, line) => sum + (line ?? "").trim().length, 0) / charactersPerSecond;
}

function shareOut(total: number, weights: number[], min: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  const shares = weights.map((w) => (sum > 0 ? (total * w) / sum : 0));
  const counts = shares.map((x) => Math.max(min, Math.floor(x)));
  let spare = Math.round(total) - counts.reduce((s, n) => s + n, 0);
  const byLoss = shares.map((_, i) => i).sort((a, b) => shares[b]! - counts[b]! - (shares[a]! - counts[a]!));
  for (let k = 0; spare > 0 && k < byLoss.length; k++, spare--) {
    counts[byLoss[k]!] = counts[byLoss[k]!]! + 1;
  }
  return counts;
}

function evenRuns(values: number[], count: number): number[][] {
  const prefix = [0];
  for (const v of values) prefix.push(prefix[prefix.length - 1]! + v);
  const n = values.length;
  const ideal = prefix[n]! / count;
  const spread = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  const runStart = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(0));
  spread[0]![0] = 0;
  for (let c = 1; c <= count; c++) {
    for (let i = c; i <= n; i++) {
      for (let j = c - 1; j < i; j++) {
        const off = prefix[i]! - prefix[j]! - ideal;
        const s = spread[c - 1]![j]! + off * off;
        if (s < spread[c]![i]!) {
          spread[c]![i] = s;
          runStart[c]![i] = j;
        }
      }
    }
  }
  const runs: number[][] = [];
  for (let c = count, i = n; c > 0; c--) {
    const j = runStart[c]![i]!;
    runs.unshift(values.slice(j, i));
    i = j;
  }
  return runs;
}

function budgetByShot(speaking: ShotList["shots"], counts: number[]): Record<string, number> {
  const byShotId: Record<string, number> = {};
  speaking.forEach((shot, i) => {
    byShotId[shot.id] = counts[i]!;
  });
  return byShotId;
}
export function narrationWordBudget(
  shotList: ShotList,
  durationSeconds: number,
  options: { silentShotsInAudio?: boolean; endingSeconds?: number; wordsPerSecond?: number } = {}
): NarrationWordBudget {
  const wordsPerSecond = options.wordsPerSecond ?? NARRATION_WORDS_PER_SECOND;
  const speaking = shotList.shots.filter((s) => s.textDensity > 0);
  const words = narrationSecondsFor(shotList, durationSeconds, options) * wordsPerSecond;
  const counts = shareOut(words, speaking.map((s) => s.durationSeconds), MIN_WORDS_PER_LINE);
  const totalWords = counts.reduce((sum, n) => sum + n, 0);
  return { totalWords, byShotId: budgetByShot(speaking, counts), wordsPerSecond };
}

export function veoWordBudget(shotList: ShotList, chunkCount: number): NarrationWordBudget {
  const speaking = shotList.shots.filter((s) => s.textDensity > 0);
  const seconds = speaking.map((s) => s.durationSeconds);
  const chunks = Math.max(1, Math.round(chunkCount));
  const counts =
    speaking.length >= chunks
      ? evenRuns(seconds, chunks).flatMap((run) => shareOut(VEO_WORDS_PER_CHUNK, run, MIN_WORDS_PER_LINE))
      : shareOut(chunks, seconds, 1).map((n) => n * VEO_WORDS_PER_CHUNK);
  const totalWords = counts.reduce((sum, n) => sum + n, 0);
  return {
    totalWords,
    byShotId: budgetByShot(speaking, counts),
    wordsPerSecond: VEO_WORDS_PER_CHUNK / VEO_CHUNK_SECONDS,
    veoChunks: chunks,
  };
}

export function splitScriptAcrossChunks(
  lines: string[],
  chunkCount: number,
  maxWords: number = VEO_MAX_WORDS_PER_CHUNK
): string[] {
  const words: string[] = [];
  const breakAfter: Array<"end" | "comma" | "phrase"> = [];
  for (const line of lines) {
    const lineWords = line.trim().split(/\s+/).filter(Boolean);
    lineWords.forEach((w, i) => {
      words.push(w);
      breakAfter.push(
        i === lineWords.length - 1 || /[.!?]["')\]]*$/.test(w) ? "end" : /[,;:]["')\]]*$/.test(w) ? "comma" : "phrase"
      );
    });
  }
  if (words.length === 0) return [];
  const count = Math.max(1, Math.min(Math.round(chunkCount), words.length));
  const cap = Math.max(maxWords, Math.ceil(words.length / count));
  type Score = [number, number, number];
  const beats = (a: Score, b: Score) => (a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2]);
  const best = Array.from({ length: count + 1 }, () => new Array<Score | null>(words.length + 1).fill(null));
  const clipStart = Array.from({ length: count + 1 }, () => new Array<number>(words.length + 1).fill(0));
  best[0]![0] = [0, 0, 0];
  for (let c = 1; c <= count; c++) {
    for (let i = c; i <= words.length; i++) {
      for (let j = Math.max(c - 1, i - cap); j < i; j++) {
        const prev = best[c - 1]![j];
        if (!prev) continue;
        const kind = j > 0 ? breakAfter[j - 1]! : "end";
        const score: Score = [
          prev[0] + (kind === "phrase" ? 1 : 0),
          prev[1] + (kind === "comma" ? 1 : 0),
          prev[2] + (i - j) * (i - j),
        ];
        const current = best[c]![i];
        if (!current || beats(score, current)) {
          best[c]![i] = score;
          clipStart[c]![i] = j;
        }
      }
    }
  }
  const chunks: string[] = [];
  for (let c = count, i = words.length; c > 0; c--) {
    const j = clipStart[c]![i]!;
    chunks.unshift(words.slice(j, i).join(" ").replace(/[,;:]$/, ""));
    i = j;
  }
  return chunks;
}

export function compositionSecondsFor(narrationSeconds: number, plannedSeconds: number): number {
  return narrationSeconds > 0
    ? narrationSeconds + NARRATION_TAIL_SECONDS
    : Math.max(1, plannedSeconds - ENDING_FADE_SECONDS);
}
export function fitShotsToLength(
  shotList: ShotList,
  motionSpec: MotionSpec,
  seconds: number
): { shotList: ShotList; motionSpec: MotionSpec } {
  const plannedSec =
    shotList.totalDurationSeconds ?? shotList.shots.reduce((s, sh) => s + (sh.durationSeconds ?? 0), 0);
  const targetSec = Math.round(seconds);
  if (!(plannedSec > 0) || !(seconds > 0) || targetSec === plannedSec) {
    return { shotList, motionSpec };
  }
  const scale = seconds / plannedSec;
  const exact = shotList.shots.map((sh) => (sh.durationSeconds ?? 0) * scale);
  const whole = exact.map((x) => Math.max(1, Math.floor(x)));
  let spare = targetSec - whole.reduce((s, n) => s + n, 0);
  const byLoss = exact.map((_, i) => i).sort((a, b) => exact[b]! - whole[b]! - (exact[a]! - whole[a]!));
  for (let k = 0; spare > 0; k++, spare--) {
    const i = byLoss[k % byLoss.length]!;
    whole[i] = whole[i]! + 1;
  }
  while (spare < 0) {
    const longest = whole.reduce((best, n, i) => (n > 1 && (best < 0 || n > whole[best]!) ? i : best), -1);
    if (longest < 0) break;
    whole[longest] = whole[longest]! - 1;
    spare++;
  }
  const shots = shotList.shots.map((sh, i) => ({ ...sh, durationSeconds: whole[i]! }));
  const total = whole.reduce((s, n) => s + n, 0);
  const shotSecondsById = new Map(shots.map((s) => [s.id, s.durationSeconds]));
  return {
    shotList: { shots, totalDurationSeconds: total },
    motionSpec: {
      entries: motionSpec.entries.map((e) => ({
        ...e,
        durationSeconds: Math.max(1, shotSecondsById.get(e.shotId) ?? Math.round((e.durationSeconds ?? 0) * scale)),
      })),
    },
  };
}
