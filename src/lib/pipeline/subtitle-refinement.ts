import type { Script, ShotList } from "@/lib/types";
import type { SubtitleChunk, SubtitleTrack } from "@/lib/types";
import type { WordTiming } from "@/lib/types";

export type RefinedSubtitleTrack = SubtitleTrack;

export function refineSubtitles(
  subtitleTrack: SubtitleTrack,
  wordTimings: WordTiming[] | undefined,
  _script: Script,
  shotList: ShotList,
  segmentDurationsMs?: number[]
): RefinedSubtitleTrack {
  const chunks = subtitleTrack.chunks;
  if (chunks.length === 0) {
    return subtitleTrack;
  }

  const sortedShots = [...(shotList.shots ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const shotIdToSegmentIndex = new Map<string, number>();
  sortedShots.forEach((s, i) => shotIdToSegmentIndex.set(s.id, i));

  if (!wordTimings || wordTimings.length === 0) {
    if (segmentDurationsMs && segmentDurationsMs.length === sortedShots.length) {
      const cumulativeStart: number[] = [];
      let sum = 0;
      for (const d of segmentDurationsMs) {
        cumulativeStart.push(sum);
        sum += d;
      }
      const chunkCountByShot = new Map<string, number>();
      for (const c of chunks) {
        const id = typeof c.shotId === "string" ? c.shotId : "";
        chunkCountByShot.set(id, (chunkCountByShot.get(id) ?? 0) + 1);
      }
      const chunkIndexInShot = new Map<string, number>();
      const refined: SubtitleChunk[] = chunks.map((c) => {
        const shotId = typeof c.shotId === "string" ? c.shotId : "";
        const segIndex = shotIdToSegmentIndex.get(shotId) ?? 0;
        const idx = chunkIndexInShot.get(shotId) ?? 0;
        chunkIndexInShot.set(shotId, idx + 1);
        const total = chunkCountByShot.get(shotId) ?? 1;
        const segStart = cumulativeStart[segIndex] ?? 0;
        const segDuration = segmentDurationsMs[segIndex] ?? 0;
        const startMs = Math.round(segStart + (idx / total) * segDuration);
        const endMs = Math.round(segStart + ((idx + 1) / total) * segDuration);
        return { text: c.text, startMs: startMs, endMs: Math.max(endMs, startMs + 1), shotId };
      });
      return { chunks: refined };
    }
    return subtitleTrack;
  }

  const totalChunkWords = chunks.reduce(
    (sum, c) => sum + c.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  if (totalChunkWords > wordTimings.length) {
    console.warn(
      "[subtitle-refinement] Chunk word count exceeds word timings; using estimated timing."
    );
    return subtitleTrack;
  }

  const refined: SubtitleChunk[] = [];
  let wordIndex = 0;

  for (const chunk of chunks) {
    const words = chunk.text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount === 0) {
      refined.push({ ...chunk });
      continue;
    }

    if (wordIndex + wordCount > wordTimings.length) {
      console.warn(
        "[subtitle-refinement] Ran out of word timings; returning original track."
      );
      return subtitleTrack;
    }

    const first = wordTimings[wordIndex]!;
    const last = wordTimings[wordIndex + wordCount - 1]!;
    refined.push({
      text: chunk.text,
      startMs: first.startMs,
      endMs: last.endMs,
      shotId: chunk.shotId,
    });
    wordIndex += wordCount;
  }

  for (let i = 0; i < refined.length - 1; i++) {
    const curr = refined[i]!;
    const next = refined[i + 1]!;
    if (curr.endMs > next.startMs) {
      curr.endMs = next.startMs;
      if (curr.endMs <= curr.startMs) {
        curr.endMs = curr.startMs + 1;
      }
    }
  }

  return { chunks: refined };
}
