import type { Script } from "@/lib/types/script";
import type { ShotList } from "@/lib/types/shots";
import type { BrandBrainInput, QualityReport } from "@/lib/types/pipelineEnhancements";

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function runQualityGate(
  script: Script,
  shotList: ShotList,
  brandBrain?: BrandBrainInput
): QualityReport {
  const issues: string[] = [];
  let score = 100;
  const spoken = script.entries
    .filter((e) => e.text != null && String(e.text).trim() !== "")
    .map((e) => String(e.text).trim());
  const totalWords = spoken.reduce((a, t) => a + countWords(t), 0);

  if (spoken.length === 0) {
    issues.push("No spoken lines in script.");
    score -= 50;
  }

  const silentShots = shotList.shots.filter((s) => s.textDensity === 0).length;
  if (silentShots === shotList.shots.length) {
    issues.push("All shots are silent; unusual for a narrated video.");
    score -= 20;
  }

  if (totalWords > 0 && totalWords < 8) {
    issues.push("Very short total dialogue; may feel abrupt.");
    score -= 15;
  }

  for (const line of spoken) {
    if (line.length > 220) {
      issues.push("One or more lines are very long for on-screen reading.");
      score -= 10;
      break;
    }
  }

  const bb = brandBrain;
  if (bb?.bannedPhrases?.length) {
    const lower = spoken.join(" ").toLowerCase();
    for (const p of bb.bannedPhrases) {
      const t = String(p).trim().toLowerCase();
      if (t && lower.includes(t)) {
        issues.push(`Banned phrase policy: found "${p}".`);
        score -= 25;
      }
    }
  }

  if (bb?.requiredPhrases?.length) {
    const joined = spoken.join(" ");
    for (const p of bb.requiredPhrases) {
      const t = String(p).trim();
      if (t && !joined.includes(t)) {
        issues.push(`Required phrase missing: "${t}".`);
        score -= 20;
      }
    }
  }

  return {
    passed: score >= 70 && issues.length === 0,
    score: Math.max(0, Math.min(100, score)),
    issues,
  };
}
