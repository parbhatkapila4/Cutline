import type { Script, ScriptEntry } from "@/lib/types";
import type { ShotList } from "@/lib/types";
import type { SubtitleChunk, SubtitleTrack } from "@/lib/types";

const MAX_WORDS_PER_CHUNK = 6;
const MIN_WORDS_BEFORE_CONJUNCTION = 2;

const PHRASE_END = /[.!?;:]$/;
const CONJUNCTIONS = new Set(["and", "but", "or", "so", "yet", "nor"]);

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const words = trimmed.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    current.push(word);

    const wordLower = word.toLowerCase().replace(PHRASE_END, "");
    const endsWithPunct = PHRASE_END.test(word);
    const isConjunction = CONJUNCTIONS.has(wordLower);

    const shouldBreak =
      endsWithPunct ||
      (isConjunction && current.length >= MIN_WORDS_BEFORE_CONJUNCTION) ||
      current.length >= MAX_WORDS_PER_CHUNK;

    if (shouldBreak && current.length > 0) {
      chunks.push(current.join(" "));
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }

  return chunks;
}

function getEntryByShotId(script: Script, shotId: string): ScriptEntry | undefined {
  return script.entries.find((e) => e.shotId === shotId);
}

export function generateSubtitles(script: Script, shotList: ShotList): SubtitleTrack {
  const shots = [...shotList.shots].sort((a, b) => a.order - b.order);
  const chunks: SubtitleChunk[] = [];
  let cumulativeMs = 0;

  for (const shot of shots) {
    const entry = getEntryByShotId(script, shot.id);
    const durationMs = shot.durationSeconds * 1000;

    if (!entry || entry.text === null || entry.text.trim() === "") {
      cumulativeMs += durationMs;
      continue;
    }

    const textChunks = chunkText(entry.text);
    if (textChunks.length === 0) {
      cumulativeMs += durationMs;
      continue;
    }

    const chunkDurationMs = durationMs / textChunks.length;
    for (let i = 0; i < textChunks.length; i++) {
      const startMs = Math.round(cumulativeMs + i * chunkDurationMs);
      const endMs = Math.round(cumulativeMs + (i + 1) * chunkDurationMs);
      chunks.push({
        text: textChunks[i]!,
        startMs,
        endMs,
        shotId: shot.id,
      });
    }

    cumulativeMs += durationMs;
  }

  return { chunks };
}
