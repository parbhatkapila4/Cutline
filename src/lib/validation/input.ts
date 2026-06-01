import { DURATION_MIN } from "@/lib/validation/duration";
import { getMaxDurationSeconds } from "@/lib/config/limits";
import type { Platform } from "@/lib/platform/types";
import { PLATFORMS } from "@/lib/platform/types";
import type { BrandColors } from "@/lib/assets/types";
import { ASPECT_RATIOS, type AspectRatio, isValidAspectRatio } from "@/lib/validation/aspectRatio";
import type { AvatarPresetId, AvatarSelection } from "@/lib/types/avatar";
import type { BrandBrainInput, ScriptFidelityMode } from "@/lib/types/pipelineEnhancements";
import { applyProgrammaticPlaceholders } from "@/lib/utils/programmatic";

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

export type ValidateInputOptions = { maxLength?: number; minLength?: number };

export function validateInput(
  input: unknown,
  options?: ValidateInputOptions
): InputValidationResult {
  const maxLen = options?.maxLength ?? MAX_INPUT_LENGTH;
  const minLen = options?.minLength ?? MIN_INPUT_LENGTH;
  if (typeof input !== "string") {
    return { valid: false, error: "Input cannot be empty." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Input cannot be empty." };
  }
  if (trimmed.length < minLen) {
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
  if (sanitized.length < minLen) {
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

function isPrivateOrInternalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true;
  }
  if (host === "169.254.169.254" || host === "metadata.google.internal") {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const o = ipv4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return true;
    const [a, b] = o as [number, number, number, number];
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (host.startsWith("fe80")) return true;
    if (host.startsWith("::ffff:")) return true;
    return false;
  }

  return false;
}

export function validateCallbackUrl(url: unknown): string | null {
  if (url === undefined || url === null) return null;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const allowLocalhost = process.env.ALLOW_LOCALHOST_WEBHOOK === "true";
    if (!allowLocalhost && isPrivateOrInternalHost(parsed.hostname)) {
      return null;
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
  talkingRealMode?: "studio" | "scenario";
  avatar?: AvatarSelection;
  renderMode?: "preview" | "final";
  previewJobId?: string;
  callbackUrl?: string;
  placeholders?: Record<string, string>;
  brandBrain?: BrandBrainInput;
  scriptFidelity?: ScriptFidelityMode;
  strictScript?: string;
  locale?: string;
  ttsVoiceId?: string;
  characterLockId?: string;
  qualityGateMode?: "off" | "warn" | "fail";
  regenFromJobId?: string;
  regenerateShotIds?: string[];
  brandKitId?: string;
  seriesId?: string;
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

  const rawRegenFromJobId = obj.regenFromJobId;
  const regenFromJobIdStr =
    typeof rawRegenFromJobId === "string" ? rawRegenFromJobId.trim() : "";

  const rawInput = obj.input;
  const topic =
    typeof rawInput === "string"
      ? rawInput.trim()
      : rawInput != null
        ? String(rawInput).trim()
        : "";
  const inputMinLen = regenFromJobIdStr ? 3 : MIN_INPUT_LENGTH;
  if (!topic) {
    errors.push({ field: "input", message: "Topic is required" });
  } else if (topic.length < inputMinLen) {
    errors.push({
      field: "input",
      message:
        regenFromJobIdStr && inputMinLen === 3
          ? "Topic is too short (min 3 characters for regeneration jobs)."
          : "Topic is too short. Please describe what you want in a sentence.",
    });
  } else if (topic.length > MAX_TOPIC_LENGTH) {
    errors.push({
      field: "input",
      message: `Topic must be at most ${MAX_TOPIC_LENGTH} characters`,
    });
  } else {
    const inputValidation = validateInput(topic, {
      maxLength: MAX_TOPIC_LENGTH,
      minLength: inputMinLen,
    });
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

  const rawTalkingRealMode = obj.talkingRealMode;
  if (rawTalkingRealMode !== undefined && rawTalkingRealMode !== null) {
    const mode = typeof rawTalkingRealMode === "string" ? rawTalkingRealMode.trim() : "";
    if (mode !== "studio" && mode !== "scenario") {
      errors.push({
        field: "talkingRealMode",
        message: 'talkingRealMode must be "studio" or "scenario"',
      });
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

  if (regenFromJobIdStr) {
    const jv = validateJobId(regenFromJobIdStr);
    if (!jv.valid) {
      errors.push({ field: "regenFromJobId", message: jv.error });
    }
  }

  const rawRegenShotIds = obj.regenerateShotIds;
  if (rawRegenShotIds !== undefined && rawRegenShotIds !== null) {
    if (!Array.isArray(rawRegenShotIds)) {
      errors.push({ field: "regenerateShotIds", message: "regenerateShotIds must be an array of strings" });
    } else if (rawRegenShotIds.length > 24) {
      errors.push({ field: "regenerateShotIds", message: "At most 24 shot ids" });
    } else if (!rawRegenShotIds.every((x) => typeof x === "string" && x.trim() !== "")) {
      errors.push({ field: "regenerateShotIds", message: "Each entry must be a non-empty string" });
    }
  }

  const rawScriptFidelity = obj.scriptFidelity;
  if (rawScriptFidelity !== undefined && rawScriptFidelity !== null) {
    const sf = typeof rawScriptFidelity === "string" ? rawScriptFidelity.trim() : "";
    if (sf !== "creative" && sf !== "strict") {
      errors.push({ field: "scriptFidelity", message: 'scriptFidelity must be "creative" or "strict"' });
    }
  }

  const rawStrictScript = obj.strictScript;
  if (typeof rawStrictScript === "string" && rawStrictScript.length > 12000) {
    errors.push({ field: "strictScript", message: "strictScript is too long (max 12000 chars)" });
  }
  const scriptFidelityCheck =
    typeof rawScriptFidelity === "string" ? rawScriptFidelity.trim() : "";
  if (scriptFidelityCheck === "strict") {
    const ss = typeof rawStrictScript === "string" ? rawStrictScript.trim() : "";
    if (ss.length < 10) {
      errors.push({
        field: "strictScript",
        message: "strictScript is required (min 10 characters) when scriptFidelity is strict",
      });
    }
  }

  const rawLocale = obj.locale;
  if (rawLocale !== undefined && rawLocale !== null) {
    const loc = typeof rawLocale === "string" ? rawLocale.trim() : "";
    if (loc.length > 40) {
      errors.push({ field: "locale", message: "locale is too long" });
    }
  }

  const rawTtsVoice = obj.ttsVoiceId;
  if (rawTtsVoice !== undefined && rawTtsVoice !== null) {
    const v = typeof rawTtsVoice === "string" ? rawTtsVoice.trim() : "";
    if (v.length > 80) {
      errors.push({ field: "ttsVoiceId", message: "ttsVoiceId is too long" });
    }
  }

  const rawCharLock = obj.characterLockId;
  if (rawCharLock !== undefined && rawCharLock !== null) {
    const c = typeof rawCharLock === "string" ? rawCharLock.trim() : "";
    if (c.length > 160) {
      errors.push({ field: "characterLockId", message: "characterLockId is too long" });
    }
  }

  const rawQg = obj.qualityGateMode;
  if (rawQg !== undefined && rawQg !== null) {
    const q = typeof rawQg === "string" ? rawQg.trim() : "";
    if (q !== "off" && q !== "warn" && q !== "fail") {
      errors.push({ field: "qualityGateMode", message: 'qualityGateMode must be "off", "warn", or "fail"' });
    }
  }

  const rawBrandKitId = obj.brandKitId;
  if (rawBrandKitId !== undefined && rawBrandKitId !== null && String(rawBrandKitId).trim() !== "") {
    const bid = typeof rawBrandKitId === "string" ? rawBrandKitId.trim() : "";
    if (!UUID_REGEX.test(bid)) {
      errors.push({ field: "brandKitId", message: "brandKitId must be a valid UUID" });
    }
  }

  const rawSeriesId = obj.seriesId;
  if (rawSeriesId !== undefined && rawSeriesId !== null && String(rawSeriesId).trim() !== "") {
    const sid = typeof rawSeriesId === "string" ? rawSeriesId.trim() : "";
    if (sid.length > 160) {
      errors.push({ field: "seriesId", message: "seriesId must be at most 160 characters" });
    }
  }

  const rawPlaceholders = obj.placeholders;
  if (rawPlaceholders !== undefined && rawPlaceholders !== null) {
    if (typeof rawPlaceholders !== "object" || Array.isArray(rawPlaceholders)) {
      errors.push({ field: "placeholders", message: "placeholders must be an object of string keys to string values" });
    } else {
      const entries = Object.entries(rawPlaceholders as Record<string, unknown>);
      if (entries.length > 40) {
        errors.push({ field: "placeholders", message: "At most 40 placeholder keys" });
      }
      for (const [k, v] of entries) {
        if (typeof k !== "string" || k.length > 64 || typeof v !== "string" || v.length > 2000) {
          errors.push({ field: "placeholders", message: "Invalid placeholder key or value" });
          break;
        }
      }
    }
  }

  const rawBrandBrain = obj.brandBrain;
  if (rawBrandBrain !== undefined && rawBrandBrain !== null) {
    if (typeof rawBrandBrain !== "object" || Array.isArray(rawBrandBrain)) {
      errors.push({ field: "brandBrain", message: "brandBrain must be an object" });
    } else {
      const bb = rawBrandBrain as Record<string, unknown>;
      const banned = bb.bannedPhrases;
      const required = bb.requiredPhrases;
      const tone = bb.voiceTone;
      const ms = bb.motionStyle;
      if (banned !== undefined && banned !== null) {
        if (!Array.isArray(banned) || !banned.every((x) => typeof x === "string") || banned.length > 24) {
          errors.push({ field: "brandBrain.bannedPhrases", message: "bannedPhrases must be an array of at most 24 strings" });
        }
      }
      if (required !== undefined && required !== null) {
        if (!Array.isArray(required) || !required.every((x) => typeof x === "string") || required.length > 24) {
          errors.push({ field: "brandBrain.requiredPhrases", message: "requiredPhrases must be an array of at most 24 strings" });
        }
      }
      if (tone !== undefined && tone !== null && (typeof tone !== "string" || String(tone).length > 500)) {
        errors.push({ field: "brandBrain.voiceTone", message: "voiceTone is too long" });
      }
      if (ms !== undefined && ms !== null) {
        const m = typeof ms === "string" ? ms.trim() : "";
        if (m !== "default" && m !== "subtle" && m !== "dynamic") {
          errors.push({
            field: "brandBrain.motionStyle",
            message: 'motionStyle must be "default", "subtle", or "dynamic"',
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const placeholdersParsed =
    rawPlaceholders != null && typeof rawPlaceholders === "object" && !Array.isArray(rawPlaceholders)
      ? (() => {
        const o: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawPlaceholders as Record<string, unknown>)) {
          if (typeof k === "string" && typeof v === "string") {
            const kk = k.trim();
            if (kk) o[kk] = v;
          }
        }
        return o;
      })()
      : undefined;

  const sanitizedTopic = sanitizeInput(
    placeholdersParsed && Object.keys(placeholdersParsed).length > 0
      ? applyProgrammaticPlaceholders(topic, placeholdersParsed)
      : topic
  );
  const postIv = validateInput(sanitizedTopic, {
    maxLength: MAX_TOPIC_LENGTH,
    minLength: regenFromJobIdStr ? 3 : MIN_INPUT_LENGTH,
  });
  if (!postIv.valid) {
    return { success: false, errors: [{ field: "input", message: postIv.error }] };
  }
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

  const talkingRealMode =
    obj.talkingRealMode === "studio" || obj.talkingRealMode === "scenario"
      ? obj.talkingRealMode
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

  const brandBrainParsed: BrandBrainInput | undefined = (() => {
    if (rawBrandBrain == null || typeof rawBrandBrain !== "object" || Array.isArray(rawBrandBrain)) {
      return undefined;
    }
    const bb = rawBrandBrain as Record<string, unknown>;
    const out: BrandBrainInput = {};
    if (Array.isArray(bb.bannedPhrases)) {
      const arr = bb.bannedPhrases
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      if (arr.length) out.bannedPhrases = arr;
    }
    if (Array.isArray(bb.requiredPhrases)) {
      const arr = bb.requiredPhrases
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      if (arr.length) out.requiredPhrases = arr;
    }
    if (typeof bb.voiceTone === "string" && bb.voiceTone.trim() !== "") {
      out.voiceTone = bb.voiceTone.trim();
    }
    if (bb.motionStyle === "default" || bb.motionStyle === "subtle" || bb.motionStyle === "dynamic") {
      out.motionStyle = bb.motionStyle;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  const scriptFidelityParsed: ScriptFidelityMode | undefined =
    rawScriptFidelity === "strict" || rawScriptFidelity === "creative"
      ? rawScriptFidelity
      : undefined;

  const strictScriptParsed =
    typeof rawStrictScript === "string" && rawStrictScript.trim() !== ""
      ? rawStrictScript.trim()
      : undefined;

  const localeParsed =
    typeof rawLocale === "string" && rawLocale.trim() !== "" ? rawLocale.trim() : undefined;

  const ttsVoiceIdParsed =
    typeof rawTtsVoice === "string" && rawTtsVoice.trim() !== ""
      ? rawTtsVoice.trim()
      : undefined;

  const characterLockIdParsed =
    typeof rawCharLock === "string" && rawCharLock.trim() !== ""
      ? rawCharLock.trim()
      : undefined;

  const qualityGateModeParsed =
    rawQg === "off" || rawQg === "warn" || rawQg === "fail" ? rawQg : undefined;

  const regenFromJobIdParsed = regenFromJobIdStr || undefined;

  const brandKitIdParsed =
    typeof rawBrandKitId === "string" && rawBrandKitId.trim() !== ""
      ? rawBrandKitId.trim()
      : undefined;

  const seriesIdParsed =
    typeof rawSeriesId === "string" && rawSeriesId.trim() !== "" ? rawSeriesId.trim() : undefined;

  const regenerateShotIdsParsed =
    Array.isArray(rawRegenShotIds) && rawRegenShotIds.length > 0
      ? (rawRegenShotIds as string[]).map((s) => s.trim()).filter(Boolean)
      : undefined;

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
    ...(talkingRealMode ? { talkingRealMode } : {}),
    ...(avatar ? { avatar } : {}),
    ...(renderMode ? { renderMode } : {}),
    ...(previewJobId ? { previewJobId } : {}),
    ...(callbackUrl ? { callbackUrl } : {}),
    ...(aspectRatioValid ? { aspectRatio: aspectRatioValid } : {}),
    ...(placeholdersParsed && Object.keys(placeholdersParsed).length > 0
      ? { placeholders: placeholdersParsed }
      : {}),
    ...(brandBrainParsed ? { brandBrain: brandBrainParsed } : {}),
    ...(scriptFidelityParsed ? { scriptFidelity: scriptFidelityParsed } : {}),
    ...(strictScriptParsed ? { strictScript: strictScriptParsed } : {}),
    ...(localeParsed ? { locale: localeParsed } : {}),
    ...(ttsVoiceIdParsed ? { ttsVoiceId: ttsVoiceIdParsed } : {}),
    ...(characterLockIdParsed ? { characterLockId: characterLockIdParsed } : {}),
    ...(qualityGateModeParsed ? { qualityGateMode: qualityGateModeParsed } : {}),
    ...(regenFromJobIdParsed ? { regenFromJobId: regenFromJobIdParsed } : {}),
    ...(regenerateShotIdsParsed?.length ? { regenerateShotIds: regenerateShotIdsParsed } : {}),
    ...(brandKitIdParsed ? { brandKitId: brandKitIdParsed } : {}),
    ...(seriesIdParsed ? { seriesId: seriesIdParsed } : {}),
  };

  return { success: true, data };
}
