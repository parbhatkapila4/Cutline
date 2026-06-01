const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export type JobFailureCode =
  | "QUOTA"
  | "TIMEOUT"
  | "AUTH"
  | "CANCELLED"
  | "QUALITY_GATE"
  | "VALIDATION"
  | "PROVIDER_ERROR"
  | "UNKNOWN";

export function mapFailedReasonToFailureCode(raw: string | null | undefined): JobFailureCode {
  if (!raw || typeof raw !== "string") return "UNKNOWN";
  const s = raw.toLowerCase();
  if (s.includes("cancelled")) return "CANCELLED";
  if (s.includes("quality") && (s.includes("gate") || s.includes("failed"))) return "QUALITY_GATE";
  if (s.includes("timeout") || s.includes("timed out") || s.includes("etimedout")) return "TIMEOUT";
  if (s.includes("401") || s.includes("403") || s.includes("api key") || s.includes("unauthorized")) {
    return "AUTH";
  }
  if (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("resource_exhausted") ||
    s.includes("rate limit") ||
    s.includes("billing")
  ) {
    return "QUOTA";
  }
  if (s.includes("validation") || s.includes("invalid") || s.includes("bad request")) {
    return "VALIDATION";
  }
  if (s.includes("fetch") || s.includes("econnrefused") || s.includes("network")) {
    return "PROVIDER_ERROR";
  }
  return "UNKNOWN";
}

const PROVIDER_PREFIX_RE = /^(HeyGen|Gemini|OpenAI|Anthropic|Replicate|ElevenLabs|Veo|Kling|Runway|Pika)\b(?:[ \t][A-Za-z][A-Za-z \t'-]{0,40})?:\s+/i;

function stripProviderPrefix(raw: string): string {
  return raw.replace(PROVIDER_PREFIX_RE, "").trim();
}

function isHeyGenAvatarQuotaError(s: string): boolean {
  return (
    s.includes("heygen") &&
    (s.includes("photo-avatar") ||
      s.includes("photo avatar") ||
      s.includes("avatar slot") ||
      s.includes("avatar quota"))
  );
}

const HEYGEN_AVATAR_QUOTA_MESSAGE =
  "Talking-character videos are temporarily unavailable. Please try Slideshow mode, or try again in a few minutes.";

export function getUserFriendlyErrorMessage(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return GENERIC_MESSAGE;
  const cleaned = stripProviderPrefix(raw);
  const s = cleaned.toLowerCase();
  if (isHeyGenAvatarQuotaError(raw.toLowerCase()) || isHeyGenAvatarQuotaError(s)) {
    return HEYGEN_AVATAR_QUOTA_MESSAGE;
  }
  if (
    s.includes("insufficient credit") ||
    s.includes("out of credit") ||
    s.includes("no credit")
  ) {
    return "Our video service is briefly out of credits. Please try again in a few minutes.";
  }
  if (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("resource_exhausted") ||
    s.includes("rate limit") ||
    s.includes("billing")
  ) {
    return "We've hit a temporary rate limit. Please try again in a moment.";
  }
  if (s.includes("401") || s.includes("api key") || s.includes("unauthorized")) {
    return "We couldn't authenticate with an upstream service. Please try again.";
  }
  if (s.includes("timeout") || s.includes("timed out")) {
    return "That took longer than expected. Please try again.";
  }
  if (!cleaned) return GENERIC_MESSAGE;
  if (cleaned.length > 140) return GENERIC_MESSAGE;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export type ErrorTone =
  | "quota"
  | "auth"
  | "timeout"
  | "network"
  | "validation"
  | "provider"
  | "cancelled"
  | "generic";

export interface ErrorPresentation {
  title: string;
  message: string;
  tone: ErrorTone;
  canRetry: boolean;
  canUpgrade: boolean;
}

export function getErrorPresentation(
  raw: string | null | undefined,
  code?: string | null,
): ErrorPresentation {
  if (code === "MONTHLY_LIMIT_REACHED" || code === "ANON_LIMIT_REACHED") {
    return {
      title: "Plan limit reached",
      message:
        (raw && raw.trim()) ||
        "You've reached your current plan limit. Upgrade to keep creating videos.",
      tone: "quota",
      canRetry: false,
      canUpgrade: true,
    };
  }

  const original = (raw ?? "").trim();
  const cleaned = stripProviderPrefix(original);
  const s = cleaned.toLowerCase();

  if (!original) {
    return {
      title: "Something went wrong",
      message: GENERIC_MESSAGE,
      tone: "generic",
      canRetry: true,
      canUpgrade: false,
    };
  }

  if (
    isHeyGenAvatarQuotaError(s) ||
    isHeyGenAvatarQuotaError(original.toLowerCase())
  ) {
    return {
      title: "Talking videos unavailable",
      message: HEYGEN_AVATAR_QUOTA_MESSAGE,
      tone: "provider",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (
    s.includes("insufficient credit") ||
    s.includes("out of credit") ||
    s.includes("no credit")
  ) {
    return {
      title: "Service temporarily unavailable",
      message:
        "Our video service is briefly out of credits. Please try again in a few minutes. We're on it.",
      tone: "provider",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("resource_exhausted") ||
    s.includes("rate limit") ||
    s.includes("billing")
  ) {
    return {
      title: "Rate limit reached",
      message: "We've hit a temporary rate limit. Please try again in a moment.",
      tone: "quota",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (
    s.includes("401") ||
    s.includes("403") ||
    s.includes("api key") ||
    s.includes("unauthorized")
  ) {
    return {
      title: "Authentication issue",
      message:
        "We couldn't authenticate with an upstream service. Please try again. If this keeps happening, contact support.",
      tone: "auth",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (s.includes("timeout") || s.includes("timed out") || s.includes("etimedout")) {
    return {
      title: "Request timed out",
      message: "That took longer than expected. Please try again.",
      tone: "timeout",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (
    s.includes("connection lost") ||
    s.includes("connection failed") ||
    s.includes("network") ||
    s.includes("econnrefused") ||
    s.includes("fetch")
  ) {
    return {
      title: "Connection issue",
      message: s.includes("connection lost")
        ? "We lost connection while checking progress. Please refresh and try again."
        : "We couldn't reach the server. Check your connection and retry.",
      tone: "network",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (s.includes("cancelled")) {
    return {
      title: "Cancelled",
      message: "Generation was cancelled.",
      tone: "cancelled",
      canRetry: true,
      canUpgrade: false,
    };
  }
  if (s.includes("validation") || s.includes("invalid") || s.includes("bad request")) {
    return {
      title: "Invalid input",
      message: getUserFriendlyErrorMessage(original),
      tone: "validation",
      canRetry: false,
      canUpgrade: false,
    };
  }
  if (PROVIDER_PREFIX_RE.test(original)) {
    const detail = cleaned.trim();
    return {
      title: "Generation failed",
      message:
        detail && detail.length <= 140
          ? `${detail.charAt(0).toUpperCase()}${detail.slice(1)}`
          : "An upstream service had trouble completing the request. Please try again.",
      tone: "provider",
      canRetry: true,
      canUpgrade: false,
    };
  }
  return {
    title: "Something went wrong",
    message: getUserFriendlyErrorMessage(original),
    tone: "generic",
    canRetry: true,
    canUpgrade: false,
  };
}

export function sanitizeErrorMessage(err: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return GENERIC_MESSAGE;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function logServerError(context: string, err: unknown): void {
  if (err instanceof Error) {
    console.error(`[${context}]`, err.message, err.stack);
  } else {
    console.error(`[${context}]`, err);
  }
}
