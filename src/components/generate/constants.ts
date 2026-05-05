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
export const SUBMIT_TIMEOUT_MS = 90_000;
export const MIN_INPUT_LENGTH = 5;
export const DURATION_DEFAULT = 30;
export const STAGE_INTERVAL_MS = 18_000;

export const DEFAULT_ASPECT_RATIO: AspectRatio = "16:9";

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
