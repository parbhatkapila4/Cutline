import { DURATION_MIN } from "@/lib/validation/duration";
import { getMaxDurationSeconds } from "@/lib/config/limits";
import type { Platform } from "@/lib/platform/types";
import { PLATFORMS } from "@/lib/platform/types";
import type { BrandColors } from "@/lib/assets/types";
import { ASPECT_RATIOS, type AspectRatio, isValidAspectRatio } from "@/lib/validation/aspectRatio";
import type { AvatarPresetId, AvatarSelection } from "@/lib/types/avatar";

const MIN_INPUT_LENGTH = 5;
const MAX_INPUT_LENGTH = 500;
const MAX_TOPIC_LENGTH = 2000;

function sanitizeForLlm(value: string): string {
  return value
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function hasPromptInjectionPattern(value: string): boolean {
  const lower = value.toLowerCase();
  const patterns = [
    "ignore previous",
    "ignore all previous",
    "disregard previous",
    "you are now",
    "new instructions:",
    "system:",
    "assistant:",
    "### instruction",
    "### system",
  ];
  return patterns.some((p) => lower.includes(p));
}

export type InputValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export type ValidateInputOptions = { maxLength?: number };

export function validateInput(
  input: unknown,
  options?: ValidateInputOptions
): InputValidationResult {
  const maxLen = options?.maxLength ?? MAX_INPUT_LENGTH;
  if (typeof input !== "string") {
    return { valid: false, error: "Input cannot be empty." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Input cannot be empty." };
  }
  if (trimmed.length < MIN_INPUT_LENGTH) {
    return {
      valid: false,
      error: "Input is too short. Please describe what you want in a sentence.",
    };
  }
  if (trimmed.length > maxLen) {
    return {
      valid: false,
      error: `Input is too long. Keep it under ${maxLen} characters.`,
    };
  }
  const sanitized = sanitizeForLlm(trimmed);
  if (sanitized.length === 0) {
    return { valid: false, error: "Input cannot be empty." };
  }
  if (sanitized.length < MIN_INPUT_LENGTH) {
    return {
      valid: false,
      error: "Input is too short. Please describe what you want in a sentence.",
    };
  }
  if (hasPromptInjectionPattern(sanitized)) {
    return {
      valid: false,
      error: "Input contains invalid instructions. Please describe what you want in a sentence.",
    };
  }
  return { valid: true };
}

export function sanitizeInput(input: string): string {
  return sanitizeForLlm(input.trim());
}

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function isValidHexColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (HEX_REGEX.test(v)) return true;
  if (/^[A-Fa-f0-9]{6}$/.test(v) || /^[A-Fa-f0-9]{3}$/.test(v)) return true;
  return false;
}

export type BrandColorsInput = {
  primary?: string;
  secondary?: string;
};

export type BrandColorsValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateBrandColors(
  colors?: BrandColorsInput | null
): BrandColorsValidationResult {
  if (colors == null || typeof colors !== "object") {
    return { valid: true };
  }
  const { primary, secondary } = colors;
  if (primary !== undefined && primary !== null && String(primary).trim() !== "") {
    if (!isValidHexColor(String(primary))) {
      return {
        valid: false,
        error: "Invalid brand color format. Use hex (e.g. #FF0000).",
      };
    }
  }
  if (secondary !== undefined && secondary !== null && String(secondary).trim() !== "") {
    if (!isValidHexColor(String(secondary))) {
      return {
        valid: false,
        error: "Invalid brand color format. Use hex (e.g. #FF0000).",
      };
    }
  }
  return { valid: true };
}

const JOB_ID_REGEX = /^[a-zA-Z0-9-]{1,64}$/;
const UUID_REGEX =
  /^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/;

export type JobIdValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateCallbackUrl(url: unknown): string | null {
  if (url === undefined || url === null) return null;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const allowLocalhost = process.env.ALLOW_LOCALHOST_WEBHOOK === "true";
    if (!allowLocalhost) {
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
        return null;
      }
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateJobId(jobId: unknown): JobIdValidationResult {
  if (typeof jobId !== "string" || jobId.length === 0) {
    return { valid: false, error: "Invalid job ID." };
  }
  const trimmed = jobId.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Invalid job ID." };
  }
  if (trimmed.length > 64) {
    return { valid: false, error: "Invalid job ID." };
  }
  if (UUID_REGEX.test(trimmed)) return { valid: true };
  if (JOB_ID_REGEX.test(trimmed)) return { valid: true };
  return { valid: false, error: "Invalid job ID." };
}

export type ValidatedGenerateInput = {
  input: string;
  durationSeconds: number;
  assetIds?: string[];
  brandColors?: BrandColors;
  mode?: "slideshow" | "talking_object";
  platform?: Platform;
  aspectRatio?: AspectRatio;
  variationCount?: number;
  textModel?: string;
  captions?: "on" | "off";
  talkingObjectStyle?: "cartoon" | "real";
  avatar?: AvatarSelection;
  renderMode?: "preview" | "final";
  previewJobId?: string;
  callbackUrl?: string;
};

export type ValidateGenerateInputResult =
  | { success: true; data: ValidatedGenerateInput }
  | { success: false; errors: Array<{ field: string; message: string }> };

function coerceNumber(
  v: unknown
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof v === "number") {
    return Number.isNaN(v) ? { ok: false, error: "Must be a number" } : { ok: true, value: v };
  }
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? { ok: false, error: "Must be a number" } : { ok: true, value: n };
  }
  return { ok: false, error: "Must be a number" };
}

const AVATAR_PRESET_IDS: AvatarPresetId[] = [
  "presenter_female_1",
  "presenter_male_1",
  "creator_female_1",
  "creator_male_1",
];

export function validateGenerateInput(
  body: unknown
): ValidateGenerateInputResult {
  const errors: Array<{ field: string; message: string }> = [];

  if (body == null || typeof body !== "object") {
    return {
      success: false,
      errors: [
        { field: "input", message: "Topic is required" },
        { field: "durationSeconds", message: "durationSeconds is required" },
      ],
    };
  }

  const obj = body as Record<string, unknown>;

  const rawInput = obj.input;
  const topic =
    typeof rawInput === "string"
      ? rawInput.trim()
      : rawInput != null
        ? String(rawInput).trim()
        : "";
  if (!topic) {
    errors.push({ field: "input", message: "Topic is required" });
  } else if (topic.length < MIN_INPUT_LENGTH) {
    errors.push({
      field: "input",
      message: "Topic is too short. Please describe what you want in a sentence.",
    });
  } else if (topic.length > MAX_TOPIC_LENGTH) {
    errors.push({
      field: "input",
      message: `Topic must be at most ${MAX_TOPIC_LENGTH} characters`,
    });
  } else {
    const inputValidation = validateInput(topic, { maxLength: MAX_TOPIC_LENGTH });
    if (!inputValidation.valid) {
      errors.push({ field: "input", message: inputValidation.error });
    }
  }

  const rawDuration = obj.durationSeconds;
  if (rawDuration === undefined || rawDuration === null) {
    errors.push({ field: "durationSeconds", message: "durationSeconds is required" });
  } else {
    const num = coerceNumber(rawDuration);
    if (!num.ok) {
      errors.push({ field: "durationSeconds", message: num.error });
    } else {
      const n = Math.round(num.value);
      if (n < DURATION_MIN) {
        errors.push({
          field: "durationSeconds",
          message: `durationSeconds must be at least ${DURATION_MIN}`,
        });
      } else {
        const maxAllowed = getMaxDurationSeconds();
        if (n > maxAllowed) {
          errors.push({
            field: "durationSeconds",
            message: `Duration cannot exceed ${maxAllowed} seconds.`,
          });
        }
      }
    }
  }

  const rawPlatform = obj.platform;
  if (rawPlatform !== undefined && rawPlatform !== null) {
    const p = typeof rawPlatform === "string" ? rawPlatform.trim().toLowerCase() : "";
    if (p === "" || !(PLATFORMS as readonly string[]).includes(p)) {
      errors.push({
        field: "platform",
        message: 'platform must be one of "general", "linkedin", "twitter", "youtube_shorts"',
      });
    }
  }

  const rawAspectRatio = obj.aspectRatio;
  if (rawAspectRatio !== undefined && rawAspectRatio !== null) {
    if (!isValidAspectRatio(typeof rawAspectRatio === "string" ? rawAspectRatio.trim() : rawAspectRatio)) {
      errors.push({
        field: "aspectRatio",
        message: `aspectRatio must be one of: ${ASPECT_RATIOS.join(", ")}`,
      });
    }
  }

  const rawVariationCount = obj.variationCount;
  if (rawVariationCount !== undefined && rawVariationCount !== null) {
    const num = coerceNumber(rawVariationCount);
    if (!num.ok) {
      errors.push({ field: "variationCount", message: num.error });
    } else {
      const n = Math.floor(num.value);
      if (n < 1 || n > 5) {
        errors.push({
          field: "variationCount",
          message: "variationCount must be an integer between 1 and 5",
        });
      }
    }
  }

  const rawMode = obj.mode;
  if (rawMode !== undefined && rawMode !== null) {
    const m = typeof rawMode === "string" ? rawMode.trim() : "";
    if (m !== "slideshow" && m !== "talking_object") {
      errors.push({
        field: "mode",
        message: 'mode must be "slideshow" or "talking_object"',
      });
    }
  }

  const rawAvatar = obj.avatar;
  if (rawAvatar !== undefined && rawAvatar !== null) {
    if (typeof rawAvatar !== "object") {
      errors.push({ field: "avatar", message: "avatar must be an object" });
    } else {
      const avatarObj = rawAvatar as Record<string, unknown>;
      const avatarMode = typeof avatarObj.mode === "string" ? avatarObj.mode.trim() : "";
      if (avatarMode !== "default" && avatarMode !== "preset" && avatarMode !== "upload") {
        errors.push({
          field: "avatar.mode",
          message: 'avatar.mode must be "default", "preset", or "upload"',
        });
      } else if (avatarMode === "preset") {
        const presetId = typeof avatarObj.presetId === "string" ? avatarObj.presetId.trim() : "";
        if (!AVATAR_PRESET_IDS.includes(presetId as AvatarPresetId)) {
          errors.push({
            field: "avatar.presetId",
            message: `avatar.presetId must be one of: ${AVATAR_PRESET_IDS.join(", ")}`,
          });
        }
      } else if (avatarMode === "upload") {
        const uploadAssetId =
          typeof avatarObj.uploadAssetId === "string"
            ? avatarObj.uploadAssetId.trim()
            : "";
        if (!uploadAssetId) {
          errors.push({
            field: "avatar.uploadAssetId",
            message: "avatar.uploadAssetId is required when avatar.mode is upload",
          });
        }
      }
    }
  }

  const rawBrandColors = obj.brandColors;
  if (rawBrandColors !== undefined && rawBrandColors !== null && typeof rawBrandColors === "object") {
    const brandResult = validateBrandColors(rawBrandColors as BrandColorsInput);
    if (!brandResult.valid) {
      errors.push({ field: "brandColors", message: brandResult.error });
    }
  }

  const rawCallbackUrl = obj.callbackUrl;
  if (rawCallbackUrl !== undefined && rawCallbackUrl !== null && String(rawCallbackUrl).trim() !== "") {
    const validatedUrl = validateCallbackUrl(rawCallbackUrl);
    if (validatedUrl === null) {
      errors.push({ field: "callbackUrl", message: "Invalid callback URL. Use http or https." });
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const sanitizedTopic = sanitizeInput(topic);
  const durationNum = coerceNumber(rawDuration);
  const durationSeconds = durationNum.ok ? Math.round(durationNum.value) : DURATION_MIN;

  const assetIds =
    Array.isArray(obj.assetIds) && obj.assetIds.every((id: unknown) => typeof id === "string")
      ? (obj.assetIds as string[])
      : undefined;

  const brandColorsValid =
    rawBrandColors != null && typeof rawBrandColors === "object"
      ? (rawBrandColors as { primary?: string; secondary?: string })
      : undefined;
  const brandColors: BrandColors | undefined =
    brandColorsValid?.primary != null && typeof brandColorsValid.primary === "string"
      ? {
        primary: brandColorsValid.primary,
        ...(brandColorsValid.secondary && typeof brandColorsValid.secondary === "string"
          ? { secondary: brandColorsValid.secondary }
          : {}),
      }
      : undefined;

  const platformRaw =
    rawPlatform != null && typeof rawPlatform === "string"
      ? rawPlatform.trim().toLowerCase()
      : "";
  const platformValid =
    platformRaw && (PLATFORMS as readonly string[]).includes(platformRaw)
      ? (platformRaw as Platform)
      : undefined;

  const variationCountValid =
    rawVariationCount == null
      ? 1
      : (() => {
        const r = coerceNumber(rawVariationCount);
        return r.ok ? Math.min(5, Math.max(1, Math.floor(r.value))) : 1;
      })();

  const modeValid =
    rawMode === "slideshow" || rawMode === "talking_object"
      ? rawMode
      : undefined;

  const textModel =
    typeof obj.textModel === "string" && obj.textModel.trim() !== ""
      ? obj.textModel.trim()
      : undefined;

  const captions =
    obj.captions === "on" || obj.captions === "off"
      ? obj.captions
      : ("on" as const);

  const talkingObjectStyle =
    obj.talkingObjectStyle === "cartoon" || obj.talkingObjectStyle === "real"
      ? obj.talkingObjectStyle
      : undefined;

  const avatar = (() => {
    const raw = obj.avatar;
    if (raw == null || typeof raw !== "object") return undefined;
    const avatarObj = raw as Record<string, unknown>;
    const mode = typeof avatarObj.mode === "string" ? avatarObj.mode.trim() : "";
    if (mode === "default") return { mode: "default" as const };
    if (mode === "preset") {
      const presetId = typeof avatarObj.presetId === "string" ? avatarObj.presetId.trim() : "";
      if (AVATAR_PRESET_IDS.includes(presetId as AvatarPresetId)) {
        return { mode: "preset" as const, presetId: presetId as AvatarPresetId };
      }
      return undefined;
    }
    if (mode === "upload") {
      const uploadAssetId =
        typeof avatarObj.uploadAssetId === "string"
          ? avatarObj.uploadAssetId.trim()
          : "";
      if (uploadAssetId) {
        return { mode: "upload" as const, uploadAssetId };
      }
      return undefined;
    }
    return undefined;
  })();

  const renderMode =
    obj.renderMode === "preview" || obj.renderMode === "final"
      ? obj.renderMode
      : undefined;

  const previewJobId =
    typeof obj.previewJobId === "string" && obj.previewJobId.trim() !== ""
      ? obj.previewJobId.trim()
      : undefined;

  const callbackUrl =
    rawCallbackUrl !== undefined && rawCallbackUrl !== null && String(rawCallbackUrl).trim() !== ""
      ? validateCallbackUrl(rawCallbackUrl) ?? undefined
      : undefined;

  const aspectRatio =
    rawAspectRatio !== undefined && rawAspectRatio !== null && typeof rawAspectRatio === "string"
      ? (rawAspectRatio.trim() as AspectRatio)
      : undefined;
  const aspectRatioValid = aspectRatio && isValidAspectRatio(aspectRatio) ? aspectRatio : undefined;

  const data: ValidatedGenerateInput = {
    input: sanitizedTopic,
    durationSeconds,
    captions,
    variationCount: variationCountValid,
    ...(assetIds?.length ? { assetIds } : {}),
    ...(brandColors ? { brandColors } : {}),
    ...(platformValid ? { platform: platformValid } : {}),
    ...(modeValid ? { mode: modeValid } : {}),
    ...(textModel ? { textModel } : {}),
    ...(talkingObjectStyle ? { talkingObjectStyle } : {}),
    ...(avatar ? { avatar } : {}),
    ...(renderMode ? { renderMode } : {}),
    ...(previewJobId ? { previewJobId } : {}),
    ...(callbackUrl ? { callbackUrl } : {}),
    ...(aspectRatioValid ? { aspectRatio: aspectRatioValid } : {}),
  };

  return { success: true, data };
}
