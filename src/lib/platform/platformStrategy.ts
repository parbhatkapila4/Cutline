import type { Platform } from "./types";

export interface PlatformConfig {
  platform: Platform;
  maxDurationSeconds?: number;
  intentSnippet: string;
  narrativeSnippet: string;
  shotsSnippet: string;
  scriptSnippet: string;
  motionSnippet?: string;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  general: {
    platform: "general",
    intentSnippet: "",
    narrativeSnippet: "",
    shotsSnippet: "",
    scriptSnippet: "",
  },
  linkedin: {
    platform: "linkedin",
    intentSnippet:
      " This video targets LinkedIn: professional tone, clear CTA, suitable for B2B, slightly longer form is okay.",
    narrativeSnippet:
      " Optimize for LinkedIn: professional narrative arc, clear value proposition, and a strong call-to-action. B2B-friendly pacing.",
    shotsSnippet:
      " Structure shots for LinkedIn: polished, professional visual flow. Slightly slower cuts, emphasis on clarity and credibility.",
    scriptSnippet:
      " Write for LinkedIn: professional language, clear value proposition, and a compelling call-to-action. B2B-friendly tone.",
  },
  twitter: {
    platform: "twitter",
    maxDurationSeconds: 120,
    intentSnippet:
      " This video targets Twitter/X: very concise, punchy hook, thread-friendly. Keep under 2 minutes.",
    narrativeSnippet:
      " Optimize for Twitter: punchy hook in the first few seconds, quick beats, thread-friendly structure. Very concise.",
    shotsSnippet:
      " Structure shots for Twitter: fast cuts, high energy, punchy transitions. Front-load impact.",
    scriptSnippet:
      " Write for Twitter: very concise copy, punchy opening line, thread-friendly. Every word counts.",
  },
  youtube_shorts: {
    platform: "youtube_shorts",
    maxDurationSeconds: 60,
    intentSnippet:
      " This video targets YouTube Shorts: vertical-first, strong hook in the first 3 seconds, high retention, 15-60 seconds.",
    narrativeSnippet:
      " Optimize for YouTube Shorts: explosive hook in the first 3 seconds, high-retention pacing, vertical-first mindset. 15-60 sec ideal.",
    shotsSnippet:
      " Structure shots for YouTube Shorts: vertical-first framing, strong hook shot first. Fast cuts to maintain retention.",
    scriptSnippet:
      " Write for YouTube Shorts: hook in the first sentence, high-retention copy. Punchy, scroll-stopping opening.",
  },
};

export function getPlatformConfig(platform: Platform): PlatformConfig {
  return PLATFORM_CONFIGS[platform] ?? PLATFORM_CONFIGS.general;
}

export type PlatformStage =
  | "intent"
  | "narrative"
  | "shots"
  | "script"
  | "motion";

export function getPlatformPromptSnippet(
  platform: Platform,
  stage: PlatformStage
): string {
  if (platform === "general") return "";
  const config = getPlatformConfig(platform);
  switch (stage) {
    case "intent":
      return config.intentSnippet;
    case "narrative":
      return config.narrativeSnippet;
    case "shots":
      return config.shotsSnippet;
    case "script":
      return config.scriptSnippet;
    case "motion":
      return config.motionSnippet ?? "";
    default:
      return "";
  }
}
