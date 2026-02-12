import { NextResponse } from "next/server";
import { getVideoQueue } from "@/lib/queue/videoQueue";
import type { BrandColors } from "@/lib/assets/types";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";
import {
  validateInput,
  validateBrandColors,
  sanitizeInput,
} from "@/lib/validation/input";

const DURATION_MIN = 10;
const DURATION_MAX = 60;

type GenerateBody = {
  input: unknown;
  assetIds?: unknown;
  brandColors?: unknown;
  mode?: unknown;
  durationSeconds?: unknown;
  textModel?: unknown;
  captions?: unknown;
  talkingObjectStyle?: unknown;
};

function isBrandColors(v: unknown): v is BrandColors {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.primary === "string" && (o.secondary === undefined || typeof o.secondary === "string");
}

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);
  const limit = await checkRateLimit(identifier, "generate");
  if (!limit.allowed) {
    const retryAfter = limit.retryAfter ?? 60;
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Send { input: string }." },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || !("input" in body)) {
    return NextResponse.json(
      { error: "Missing field: input (one sentence of intent)." },
      { status: 400 }
    );
  }

  const { input, assetIds, brandColors, mode, durationSeconds: bodyDuration, textModel: bodyTextModel, captions: bodyCaptions, talkingObjectStyle: bodyTalkingObjectStyle } = body as GenerateBody;

  const inputValidation = validateInput(input);
  if (!inputValidation.valid) {
    return NextResponse.json(
      { error: inputValidation.error },
      { status: 400 }
    );
  }

  const brandValidation = validateBrandColors(
    brandColors !== undefined && typeof brandColors === "object" ? (brandColors as { primary?: string; secondary?: string }) : undefined
  );
  if (!brandValidation.valid) {
    return NextResponse.json(
      { error: brandValidation.error },
      { status: 400 }
    );
  }

  if (mode !== undefined && mode !== "slideshow" && mode !== "talking_object") {
    return NextResponse.json(
      { error: 'Invalid mode. Must be "slideshow" or "talking_object".' },
      { status: 400 }
    );
  }

  let durationSeconds: number | undefined;
  if (bodyDuration !== undefined) {
    const n =
      typeof bodyDuration === "number"
        ? Math.round(bodyDuration)
        : typeof bodyDuration === "string"
          ? parseInt(bodyDuration, 10)
          : NaN;
    if (Number.isNaN(n) || n < DURATION_MIN || n > DURATION_MAX) {
      return NextResponse.json(
        { error: `durationSeconds must be a number between ${DURATION_MIN} and ${DURATION_MAX}.` },
        { status: 400 }
      );
    }
    durationSeconds = n;
  }

  if (mode === "talking_object" && durationSeconds === undefined) {
    durationSeconds = 30;
  }

  const assetIdsArray =
    Array.isArray(assetIds) && assetIds.every((id) => typeof id === "string")
      ? (assetIds as string[])
      : undefined;

  const brandColorsValid = brandColors !== undefined && isBrandColors(brandColors) ? (brandColors as BrandColors) : undefined;
  const validMode = mode === "slideshow" || mode === "talking_object" ? (mode as "slideshow" | "talking_object") : undefined;
  const textModel =
    typeof bodyTextModel === "string" && bodyTextModel.trim() !== ""
      ? bodyTextModel.trim()
      : undefined;

  const captionsValid =
    bodyCaptions === "on" || bodyCaptions === "off"
      ? (bodyCaptions as "on" | "off")
      : ("on" as const);

  const talkingObjectStyleValid =
    bodyTalkingObjectStyle === "cartoon" || bodyTalkingObjectStyle === "real"
      ? (bodyTalkingObjectStyle as "cartoon" | "real")
      : undefined;

  try {
    const queue = getVideoQueue();
    const { incrementApiCallsThisMonth, getTokens } = await import("@/lib/usage");
    await getTokens(identifier);
    const job = await queue.add("video", {
      input: sanitizeInput(String(input)),
      clientId: identifier,
      ...(assetIdsArray?.length ? { assetIds: assetIdsArray } : {}),
      ...(brandColorsValid ? { brandColors: brandColorsValid } : {}),
      ...(validMode ? { mode: validMode } : {}),
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(textModel ? { textModel } : {}),
      captions: captionsValid,
      ...(talkingObjectStyleValid ? { talkingObjectStyle: talkingObjectStyleValid } : {}),
    });
    await incrementApiCallsThisMonth(identifier);
    const jobId = String(job.id);
    console.log("[api] POST /api/generate jobId=" + jobId);
    return NextResponse.json({ jobId });
  } catch (e) {
    const { logServerError, sanitizeErrorMessage } = await import("@/lib/utils/error");
    logServerError("POST /api/generate", e);
    return NextResponse.json(
      { error: sanitizeErrorMessage(e) },
      { status: 500 }
    );
  }
}
