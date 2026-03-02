export type Platform =
  | "linkedin"
  | "twitter"
  | "youtube_shorts"
  | "general";

export const PLATFORMS: readonly Platform[] = [
  "general",
  "linkedin",
  "twitter",
  "youtube_shorts",
] as const;

export const DEFAULT_PLATFORM: Platform = "general";
