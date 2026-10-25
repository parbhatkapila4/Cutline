import type { AspectRatio } from "@/lib/validation/aspectRatio";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type JobVariation = {
  videoUrl: string;
  cost?: { total: number };
};

export type RecentJob = {
  jobId: string;
  status: string;
  createdAt: string;
  videoUrl?: string;
  topic?: string;
  error?: string;
};

export const POLL_INITIAL_DELAY_MS = 2000;
export const POLL_BACKOFF_FACTOR = 2;
export const POLL_MAX_DELAY_MS = 15000;
export const POLL_MAX_TOTAL_MS = 30 * 60 * 1000;
export const POLL_REQUEST_TIMEOUT_MS = 20_000;
export const SUBMIT_TIMEOUT_MS = 90_000;
export const MIN_INPUT_LENGTH = 5;
export const DURATION_DEFAULT = 30;
export const STAGE_INTERVAL_MS = 18_000;

export const DEFAULT_ASPECT_RATIO: AspectRatio = "16:9";
export const PIPELINE_STEPS = [
  "Analyzing prompt",
  "Writing script",
  "Sourcing visuals",
  "Generating voice",
  "Rendering video",
] as const;

export const PIPELINE_STAGE_STEP: Record<string, number> = {
  intent: 0,
  narrative: 0,
  shots: 1,
  script: 1,
  asset_analysis: 2,
  visuals: 2,
  image_sourcing: 2,
  motion: 2,
  tts: 3,
  subtitles: 3,
  subtitle_refine: 3,
  veo: 4,
  heygen: 4,
  concat: 4,
  burn_subtitles: 4,
  render: 4,
};

export const EXAMPLES = [
  { label: "Explainer", prompt: "Explain why we dream in 30 seconds, friendly tone" },
  { label: "Product", prompt: "Promote a meditation app with calming visuals" },
  { label: "Educational", prompt: "How photosynthesis works for middle schoolers" },
  { label: "Marketing", prompt: "Announce a coffee shop grand opening, warm vibes" },
];

export const FIELD_LABELS: Record<string, string> = {
  input: "Topic",
  durationSeconds: "Duration",
  platform: "Platform",
  aspectRatio: "Aspect ratio",
  variationCount: "Number of variants",
  mode: "Video style",
  brandColors: "Brand colors",
};

export const STAGES = [
  { label: "Analyzing your prompt", icon: "🎯" },
  { label: "Writing the script", icon: "✍️" },
  { label: "Sourcing visuals", icon: "🖼️" },
  { label: "Generating voiceover", icon: "🎙️" },
  { label: "Rendering video", icon: "🎬" },
];
