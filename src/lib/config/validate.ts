export type ValidatedConfig = {
  redisUrl: string;
  openRouterApiKey: string;
  ttsProvider: "elevenlabs" | "playht";
  elevenLabsApiKey: string;
  playhtApiKey?: string;
  playhtUserId?: string;
  adminSecret?: string;
  rateLimitMax?: number;
  rateLimitWindowSeconds?: number;
  jobRetentionDays?: number;
  telemetryFile?: string;
  cleanupEnabled?: boolean;
  videoRetentionHours?: number;
  uploadRetentionHours?: number;
};

const REQUIRED_VARS = [
  "REDIS_URL",
  "OPENROUTER_API_KEY",
] as const;

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function parseNumber(value: string | undefined, defaultVal: number): number {
  if (value === undefined || value === "") return defaultVal;
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultVal;
}

export function validateConfig(): ValidatedConfig {
  const missing: string[] = [];

  for (const name of REQUIRED_VARS) {
    if (!getEnv(name)) missing.push(name);
  }

  const ttsProvider = (process.env.TTS_PROVIDER ?? "elevenlabs").toLowerCase();
  if (ttsProvider === "playht") {
    if (!getEnv("PLAYHT_API_KEY")) missing.push("PLAYHT_API_KEY");
    if (!getEnv("PLAYHT_USER_ID")) missing.push("PLAYHT_USER_ID");
  } else {
    if (!getEnv("ELEVENLABS_API_KEY")) missing.push("ELEVENLABS_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      "Missing required environment variables: " +
      missing.join(", ") +
      ". See README for configuration."
    );
  }

  const redisUrl = getEnv("REDIS_URL") ?? "redis://localhost:6379";
  const openRouterApiKey = getEnv("OPENROUTER_API_KEY")!;
  const elevenLabsApiKey = getEnv("ELEVENLABS_API_KEY") ?? "";
  const playhtApiKey = getEnv("PLAYHT_API_KEY");
  const playhtUserId = getEnv("PLAYHT_USER_ID");

  const adminSecret = getEnv("ADMIN_SECRET") ?? getEnv("ADMIN_API_SECRET");
  if (adminSecret !== undefined && adminSecret.length === 0) {
    console.warn("[config] ADMIN_SECRET is empty; admin routes will return 401.");
  }

  const rateLimitMax = parseNumber(
    process.env.RATE_LIMIT_MAX ?? process.env.RATE_LIMIT_GENERATE,
    5
  );
  if (process.env.RATE_LIMIT_MAX !== undefined && (Number.isNaN(Number(process.env.RATE_LIMIT_MAX)) || Number(process.env.RATE_LIMIT_MAX) <= 0)) {
    console.warn("[config] RATE_LIMIT_MAX invalid; using default 5.");
  }

  const rateLimitWindowSeconds = parseNumber(process.env.RATE_LIMIT_WINDOW_SECONDS, 3600);
  if (process.env.RATE_LIMIT_WINDOW_SECONDS !== undefined && (Number.isNaN(Number(process.env.RATE_LIMIT_WINDOW_SECONDS)) || Number(process.env.RATE_LIMIT_WINDOW_SECONDS) <= 0)) {
    console.warn("[config] RATE_LIMIT_WINDOW_SECONDS invalid; using default 3600.");
  }

  const jobRetentionDaysRaw = process.env.JOB_RETENTION_DAYS;
  const jobRetentionDays = jobRetentionDaysRaw != null && jobRetentionDaysRaw !== ""
    ? Math.max(0, Math.floor(Number(jobRetentionDaysRaw)) || 0)
    : 0;
  if (jobRetentionDaysRaw !== undefined && jobRetentionDaysRaw !== "" && (Number.isNaN(Number(jobRetentionDaysRaw)) || Number(jobRetentionDaysRaw) < 0)) {
    console.warn("[config] JOB_RETENTION_DAYS invalid (must be non-negative); disabling.");
  }

  const telemetryFile = getEnv("TELEMETRY_FILE") ?? getEnv("TELEMETRY_PERSIST_PATH");
  const cleanupEnabled = process.env.CLEANUP_ENABLED !== "false";
  const videoRetentionHours = parseNumber(process.env.VIDEO_RETENTION_HOURS, 24);
  const uploadRetentionHours = parseNumber(process.env.UPLOAD_RETENTION_HOURS, 24);

  return {
    redisUrl,
    openRouterApiKey,
    ttsProvider: ttsProvider === "playht" ? "playht" : "elevenlabs",
    elevenLabsApiKey,
    ...(playhtApiKey ? { playhtApiKey } : {}),
    ...(playhtUserId ? { playhtUserId } : {}),
    ...(adminSecret ? { adminSecret } : {}),
    rateLimitMax,
    rateLimitWindowSeconds,
    ...(jobRetentionDays > 0 ? { jobRetentionDays } : {}),
    ...(telemetryFile ? { telemetryFile } : {}),
    cleanupEnabled,
    videoRetentionHours,
    uploadRetentionHours,
  };
}
