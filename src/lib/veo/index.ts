import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

import { getDuration } from "@/lib/pipeline/concatMp4";
import { recordRenderEvent } from "@/lib/telemetry/renderEvents";
import { parseHttpStatus } from "@/lib/utils/retry";
import { isValidAspectRatio, type AspectRatio } from "@/lib/validation/aspectRatio";
import { ensureVertexCredentials } from "@/lib/veo/credentials";

const VEO_MODEL = process.env.VEO_MODEL || "veo-3.1-fast-generate-001";
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_DURATION_MS = 600_000;

const QUOTA_LIMIT_PATTERNS = [
  "quota",
  "rate limit",
  "resource exhausted",
  "resource_exhausted",
  "429",
  "limit exceeded",
  "daily limit",
  "per minute",
];

function isQuotaOrLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return QUOTA_LIMIT_PATTERNS.some((p) => lower.includes(p));
}

const TRANSIENT_INTERNAL_PATTERNS = [
  "internal server",
  "internal error",
  "internalservererror",
  "try again in a few minutes",
  "try again later",
  "please try again",
  "503",
  "500",
  "backend error",
  "temporarily unavailable",
];

function isTransientInternalError(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSIENT_INTERNAL_PATTERNS.some((p) => lower.includes(p));
}
const VERTEX_CONFIG_PATTERNS = [
  "permission_denied",
  "permission denied",
  "does not have permission",
  "caller does not have permission",
  "service_disabled",
  "serviceusage",
  "has not been used in project",
  "api is not enabled",
  "is disabled",
  "billing",
  "failed_precondition",
  "consumer_invalid",
  "unauthenticated",
  "could not load the default credentials",
  "could not refresh access token",
  "unable to detect a project id",
];

function isVertexConfigError(message: string): boolean {
  const lower = message.toLowerCase();
  return VERTEX_CONFIG_PATTERNS.some((p) => lower.includes(p));
}

const AI_STUDIO_CREDENTIAL_MARKERS = ["api key", "apikey", "express mode"];

function isAiStudioFallback(message: string): boolean {
  const lower = message.toLowerCase();
  if (!lower.includes("gemini api")) return false;
  return AI_STUDIO_CREDENTIAL_MARKERS.some((marker) => lower.includes(marker));
}

interface VertexErrorStatus {
  code: number | null;
  status: string | null;
  message: string | null;
  details: unknown;
}

function parseVertexErrorStatus(raw: string): VertexErrorStatus | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || !("error" in parsed)) return null;
  const inner = (parsed as { error?: unknown }).error;
  if (inner === null || typeof inner !== "object") return null;
  const e = inner as Record<string, unknown>;
  return {
    code: typeof e.code === "number" ? e.code : null,
    status: typeof e.status === "string" ? e.status : null,
    message: typeof e.message === "string" ? e.message : null,
    details: e.details ?? null,
  };
}

export class VeoQuotaOrLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoQuotaOrLimitError";
  }
}

export class VeoContentFilteredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoContentFilteredError";
  }
}

export class VeoInternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoInternalServerError";
  }
}

export class VeoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoConfigurationError";
  }
}

export type VeoErrorKind =
  | "ai_studio_fallback"
  | "quota"
  | "model_not_found"
  | "configuration"
  | "transient"
  | "generic";

export interface VeoErrorClassification {
  kind: VeoErrorKind;
  errorCode: string;
  httpStatus: number | null;
  rpcStatus: string | null;
}

export function classifyVeoError(raw: string): VeoErrorClassification {
  const parsed = parseVertexErrorStatus(raw);
  const httpStatus = parsed?.code ?? parseHttpStatus(raw);
  const rpcStatus = parsed?.status ?? null;
  const base = { httpStatus, rpcStatus };

  if (isAiStudioFallback(raw)) {
    return { ...base, kind: "ai_studio_fallback", errorCode: "veo_ai_studio_fallback" };
  }

  if (httpStatus === 429 || rpcStatus === "RESOURCE_EXHAUSTED") {
    return {
      ...base,
      kind: "quota",
      errorCode: httpStatus != null ? `veo_quota_${httpStatus}` : "veo_quota",
    };
  }
  if (httpStatus === 404 || rpcStatus === "NOT_FOUND") {
    return { ...base, kind: "model_not_found", errorCode: "veo_model_not_found" };
  }

  if (
    rpcStatus === "PERMISSION_DENIED" ||
    rpcStatus === "UNAUTHENTICATED" ||
    rpcStatus === "FAILED_PRECONDITION" ||
    isVertexConfigError(raw)
  ) {
    return {
      ...base,
      kind: "configuration",
      errorCode: httpStatus != null ? `veo_config_${httpStatus}` : "veo_config_error",
    };
  }


  if (isQuotaOrLimitError(raw)) {
    return {
      ...base,
      kind: "quota",
      errorCode: httpStatus != null ? `veo_quota_${httpStatus}` : "veo_quota",
    };
  }

  if (isTransientInternalError(raw)) {
    return {
      ...base,
      kind: "transient",
      errorCode: httpStatus != null ? `veo_http_${httpStatus}` : "veo_transient",
    };
  }

  return {
    ...base,
    kind: "generic",
    errorCode: httpStatus != null ? `veo_http_${httpStatus}` : "veo_unknown",
  };
}

const CONFIG_USER_MESSAGE =
  "Talking-character video isn’t available on this setup right now (server configuration problem). Use slideshow mode instead.";

function throwFromVeoRaw(raw: string, jobId: string): never {
  const { kind, errorCode, httpStatus, rpcStatus } = classifyVeoError(raw);

  recordRenderEvent({
    jobId,
    eventType: "provider_error",
    stageName: "veo",
    errorCode,
    providerError: raw,
  });

  switch (kind) {
    case "ai_studio_fallback":
      console.error(
        "[veo] MISCONFIGURATION: the client fell back to the AI Studio (Gemini) API instead of Vertex AI. " +
        "Veo must run on Vertex so spend lands on the GCP project. Check that GOOGLE_CLOUD_PROJECT and " +
        "GOOGLE_CLOUD_LOCATION are set and that no apiKey is being passed to GoogleGenAI. Raw: " + raw
      );
      throw new VeoConfigurationError(CONFIG_USER_MESSAGE);

    case "quota":
      console.error("[veo] quota/rate limit (raw):", raw);
      throw new VeoQuotaOrLimitError(
        "We couldn’t create the talking-character video right now. The service may be busy or temporarily full. Please try again in a few minutes."
      );

    case "model_not_found":
      console.error(
        "[veo] MISCONFIGURATION: Vertex AI has no such publisher model. The two things to check are the " +
        `model id and the region: VEO_MODEL=${VEO_MODEL}, GOOGLE_CLOUD_LOCATION=${process.env.GOOGLE_CLOUD_LOCATION ?? "(unset)"}. ` +
        "Either the model id is wrong or retired (preview ids get withdrawn), or it is not served in that region. Raw: " + raw
      );
      throw new VeoConfigurationError(CONFIG_USER_MESSAGE);

    case "configuration":
      console.error(
        "[veo] MISCONFIGURATION: Vertex AI rejected the call for a deployment reason " +
        `(status=${String(httpStatus)}, rpcStatus=${String(rpcStatus)}). ` +
        "Check: aiplatform.googleapis.com enabled on the project, the service account has roles/aiplatform.user, " +
        "billing is active, and GOOGLE_SERVICE_ACCOUNT_JSON_B64 / ADC resolve. Raw: " + raw
      );
      throw new VeoConfigurationError(CONFIG_USER_MESSAGE);

    case "transient":
      console.error("[veo] transient internal error (raw):", raw);
      throw new VeoInternalServerError(
        "The video service had a temporary internal error. Please try again in a few minutes."
      );

    case "generic":
      console.error("[veo] generation error (raw):", raw);
      throw new Error(
        "We couldn’t create the talking-character video. Try a slightly different description, switch to cartoon style if you used a real person, or use slideshow mode instead."
      );
  }
}

function createVertexClient(): GoogleGenAI {
  ensureVertexCredentials();

  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim();

  if (!project || !location) {
    const missing = [
      project ? null : "GOOGLE_CLOUD_PROJECT",
      location ? null : "GOOGLE_CLOUD_LOCATION",
    ].filter((v): v is string => v !== null);
    console.error(
      `[veo] Missing ${missing.join(" and ")}. Veo runs on Vertex AI and cannot start without them.`
    );
    throw new VeoConfigurationError(
      "Talking-character video isn’t available on this setup right now (server configuration problem). Use slideshow mode instead."
    );
  }

  return new GoogleGenAI({ vertexai: true, project, location });
}

const MIN_VIDEO_BYTES = 500_000;

const MIN_VIDEO_DURATION_SEC = 0.5;

export type TalkingObjectStyle = "cartoon" | "real";

export interface GenerateTalkingVideoOptions {
  talkingObjectStyle?: TalkingObjectStyle;
  aspectRatio?: string;
}

function veoConfigAspectRatio(user?: string): "16:9" | "9:16" {
  if (!user || !isValidAspectRatio(user)) return "16:9";
  const portrait: AspectRatio[] = ["9:16", "4:5"];
  if (portrait.includes(user)) return "9:16";
  return "16:9";
}

export async function generateTalkingVideoWithVeo(
  prompt: string,
  jobId: string,
  outputPath: string,
  options?: GenerateTalkingVideoOptions
): Promise<void> {
  const style = options?.talkingObjectStyle ?? "cartoon";

  const ai = createVertexClient();

  const config: {
    aspectRatio?: string;
    durationSeconds?: number;
  } = {
    aspectRatio: veoConfigAspectRatio(options?.aspectRatio),
    durationSeconds: 8,
  };

  let operation: Awaited<ReturnType<typeof ai.models.generateVideos>>;
  try {
    operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt,
      config,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throwFromVeoRaw(msg, jobId);
  }

  const pollStartedAt = Date.now();
  while (!operation.done) {
    if (Date.now() - pollStartedAt >= MAX_POLL_DURATION_MS) {
      throw new Error(
        `Video generation timed out after ${Math.round(MAX_POLL_DURATION_MS / 60_000)} minutes. Please try again.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      operation = await ai.operations.getVideosOperation({ operation });
    } catch (pollErr) {
      const msg = pollErr instanceof Error ? pollErr.message : String(pollErr);
      throwFromVeoRaw(msg, jobId);
    }
  }

  if (operation.error) {
    const msg =
      typeof operation.error === "object" && operation.error !== null && "message" in operation.error
        ? String((operation.error as { message?: unknown }).message)
        : String(operation.error);
    throwFromVeoRaw(msg, jobId);
  }

  const resp = operation.response;
  const raiCount = resp?.raiMediaFilteredCount ?? 0;
  const raiReasons = resp?.raiMediaFilteredReasons ?? [];

  if (raiCount > 0 || raiReasons.length > 0) {
    const userMessage =
      style === "real"
        ? `That description wasn’t accepted for a real-person look (often for safety or policy reasons). Try “Cartoon” style or change what you asked for.`
        : `That description wasn’t accepted (often for safety or policy reasons). Try changing your topic or wording.`;
    const raiDetail = { raiMediaFilteredCount: raiCount, raiMediaFilteredReasons: raiReasons };
    console.error("[veo] RAI/filtered response:", raiDetail);
    recordRenderEvent({
      jobId,
      eventType: "provider_error",
      stageName: "veo",
      errorCode: "veo_content_filtered",
      providerError: JSON.stringify(raiDetail),
    });
    throw new VeoContentFilteredError(userMessage);
  }

  const generatedVideos = resp?.generatedVideos;
  if (!generatedVideos?.length || !generatedVideos[0]?.video) {
    const safeResp = resp
      ? {
        responseKeys: Object.keys(resp),
        generatedVideosLength: generatedVideos?.length ?? "missing",
        raiMediaFilteredCount: resp.raiMediaFilteredCount,
        raiMediaFilteredReasons: resp.raiMediaFilteredReasons,
      }
      : { responseKeys: "no response" };
    console.error(
      "[veo] No video in response. Diagnostic:",
      JSON.stringify(safeResp, null, 2)
    );
    recordRenderEvent({
      jobId,
      eventType: "provider_error",
      stageName: "veo",
      errorCode: "veo_empty_response",
      providerError: JSON.stringify(safeResp),
    });
    throw new Error(
      "We couldn’t retrieve your talking-character video from the service. Please try again, or use slideshow mode."
    );
  }

  const videoFile = generatedVideos[0].video;
  const destPath = path.resolve(outputPath);
  const videoBytes = videoFile.videoBytes;
  if (typeof videoBytes !== "string" || videoBytes.length === 0) {
    const shape = {
      videoKeys: Object.keys(videoFile),
      generatedVideoKeys: Object.keys(generatedVideos[0]),
      mimeType: videoFile.mimeType ?? null,
      uri: videoFile.uri ?? null,
      videoBytesType: typeof videoBytes,
    };
    console.error("[veo] no videoBytes on the returned video object. Shape:", JSON.stringify(shape));
    recordRenderEvent({
      jobId,
      eventType: "provider_error",
      stageName: "veo",
      errorCode: "veo_no_video_bytes",
      providerError: JSON.stringify(shape),
    });
    throw new Error(
      "Vertex returned a video object with no inline bytes " +
      `(video keys: [${shape.videoKeys.join(", ")}], generatedVideos[0] keys: [${shape.generatedVideoKeys.join(", ")}], ` +
      `mimeType: ${String(shape.mimeType)}, uri: ${String(shape.uri)}). ` +
      "If uri is a gs:// path then outputGcsUri was set somewhere and the bytes must be fetched from GCS instead."
    );
  }

  try {
    fs.writeFileSync(destPath, Buffer.from(videoBytes, "base64"));
  } catch (writeErr) {
    const msg = writeErr instanceof Error ? writeErr.message : String(writeErr);
    console.error("[veo] failed writing video to disk:", outputPath, msg);
    throw new Error(
      "We couldn’t save your talking-character video after it was generated. Try again, or use slideshow mode."
    );
  }

  try {
    const stat = fs.statSync(destPath);
    if (stat.size < MIN_VIDEO_BYTES) {
      fs.unlinkSync(destPath);
      throw new Error(
        style === "real"
          ? "The file we got back wasn’t usable for a real-person video. Try “Cartoon” style or a different description."
          : "The file we got back wasn’t usable. Try a different description or slideshow mode."
      );
    }
    const durationSec = getDuration(destPath);
    if (durationSec < MIN_VIDEO_DURATION_SEC) {
      fs.unlinkSync(destPath);
      throw new Error(
        "The generated video appears empty or invalid (duration too short). Try a different prompt or style."
      );
    }
  } catch (err) {
    if (err instanceof VeoQuotaOrLimitError) throw err;
    throw new Error(
      `Failed to validate generated video: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
