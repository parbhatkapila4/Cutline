import type { Script, ScriptEntry } from "@/lib/types";
import type { ShotList } from "@/lib/types";
import type { SubtitleChunk, SubtitleTrack } from "@/lib/types";
import { chunkCaptionText } from "@/lib/pipeline/captionChunks";

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

    const textChunks = chunkCaptionText(entry.text);
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
