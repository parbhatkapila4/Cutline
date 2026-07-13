export function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  const lower = msg.toLowerCase();

  if (name === "AbortError" && lower.includes("cancel")) return false;
  if (name === "VeoContentFilteredError") return false;
  if (name === "VeoInternalServerError") return true;

  const status = parseHttpStatus(err);
  if (status != null) {
    if (status === 429 || status === 408 || status === 504) return true;
    if (status >= 500 && status < 600) return true;
    if (status >= 400 && status < 500) return false;
  }

  if (
    lower.includes("validation") ||
    lower.includes("invalid") ||
    lower.includes("required") ||
    lower.includes("missing props") ||
    lower.includes("user-cancelled")
  ) {
    return false;
  }

  return (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("network") ||
    lower.includes("rate limit")
  );
}

export function parseHttpStatus(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

export function isRetryableNetworkOrTimeout(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  const lower = msg.toLowerCase();
  return (
    name === "AbortError" ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("network")
  );
}

export function shouldRetryForLLM(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  const status = parseHttpStatus(err);
  if (status != null) {
    if (status === 429 || status === 408 || status === 504) return true;
    if (status >= 500 && status < 600) return true;
    if (status === 404 && lower.includes("no endpoints found")) return true;
    if (status === 400 || status === 401 || status === 403) return false;
  }
  return isRetryableNetworkOrTimeout(err);
}

export function shouldRetryForTTS(err: unknown): boolean {
  const status = parseHttpStatus(err);
  if (status != null) {
    if (status === 429 || (status >= 500 && status < 600)) return true;
    if (status === 400 || status === 401 || status === 403) return false;
  }
  return isRetryableNetworkOrTimeout(err);
}

export function shouldRetryForImage(err: unknown): boolean {
  const status = parseHttpStatus(err);
  if (status != null) {
    if (status === 429 || (status >= 500 && status < 600)) return true;
    if (status === 404 || status === 400 || status === 401) return false;
  }
  return isRetryableNetworkOrTimeout(err);
}

export function shouldRetryForRender(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("timed out") || lower.includes("sigterm") || lower.includes("timeout")) return true;
  if (lower.includes("render failed") || lower.includes("exit")) return true;
  if (lower.includes("invalid") || lower.includes("missing props") || lower.includes("not found")) return false;
  return false;
}

export type RetryOptions = {
  maxRetries: number;
  backoffMs: number[];
  shouldRetry: (err: unknown) => boolean;
  label?: string;
};

function getRetryEnabled(): boolean {
  const v = process.env.RETRY_ENABLED;
  if (v === "false" || v === "0") return false;
  return true;
}

export function getRetryConfig(): {
  enabled: boolean;
  llm: { maxRetries: number; backoffMs: number[] };
  tts: { maxRetries: number; backoffMs: number[] };
  image: { maxRetries: number; backoffMs: number[] };
  render: { maxRetries: number; backoffMs: number[] };
} {
  const enabled = getRetryEnabled();
  const llmMax = Math.max(0, parseInt(process.env.RETRY_LLM_MAX ?? "3", 10));
  const ttsMax = Math.max(0, parseInt(process.env.RETRY_TTS_MAX ?? "3", 10));
  const imageMax = Math.max(0, parseInt(process.env.RETRY_IMAGE_MAX ?? "2", 10));
  const renderMax = Math.max(0, parseInt(process.env.RETRY_RENDER_MAX ?? "2", 10));
  return {
    enabled,
    llm: { maxRetries: llmMax, backoffMs: [1000, 2000, 4000] },
    tts: { maxRetries: ttsMax, backoffMs: [2000, 4000, 8000] },
    image: { maxRetries: imageMax, backoffMs: [1000, 2000] },
    render: { maxRetries: renderMax, backoffMs: [5000, 10000] },
  };
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxRetries, backoffMs, shouldRetry, label = "call" } = options;
  const config = getRetryConfig();
  if (!config.enabled || maxRetries <= 0) {
    return fn();
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      if (!shouldRetry(err)) {
        throw err;
      }
      const delayMs = backoffMs[Math.min(attempt, backoffMs.length - 1)] ?? backoffMs[backoffMs.length - 1];
      console.warn(
        `[retry] Retrying ${label} (attempt ${attempt + 2}/${maxRetries + 1}) after ${delayMs}ms. Error: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${message} Failed after ${maxRetries + 1} retries.`);
}

export type WithRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 10000;

  if (!getRetryEnabled() || maxAttempts <= 1) {
    return fn();
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts - 1) break;
      if (!isRetryableError(err)) {
        throw err;
      }
      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      console.warn(
        `[retry] Attempt ${attempt + 2}/${maxAttempts} after ${delayMs}ms. Error: ${err instanceof Error ? err.message : String(err)}`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${message} Failed after ${maxAttempts} attempts.`);
}
