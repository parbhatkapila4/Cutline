const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function getUserFriendlyErrorMessage(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return GENERIC_MESSAGE;
  const s = raw.toLowerCase();
  if (
    s.includes("429") ||
    s.includes("quota") ||
    s.includes("resource_exhausted") ||
    s.includes("rate limit") ||
    s.includes("billing")
  ) {
    return "You've hit a rate limit or run out of quota. Try again later or check your API plan.";
  }
  if (s.includes("401") || s.includes("api key") || s.includes("unauthorized")) {
    return "Invalid or missing API key. Check your settings.";
  }
  if (s.includes("timeout") || s.includes("timed out")) {
    return "Request took too long. Try again.";
  }
  if (raw.length > 120) return GENERIC_MESSAGE;
  return raw;
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
