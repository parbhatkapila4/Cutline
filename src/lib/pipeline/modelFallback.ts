import { shouldRetryForLLM } from "@/lib/utils/retry";
import { LlmHttpError, type ModelCandidate } from "@/lib/llm/chat";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export function getModelCandidates(primaryModel: string): string[] {
  const configuredFallbacks = (process.env.OPENROUTER_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const raw = [primaryModel, ...configuredFallbacks, DEFAULT_MODEL];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const model of raw) {
    if (!seen.has(model)) {
      seen.add(model);
      deduped.push(model);
    }
  }
  return deduped;
}

export type LlmStage =
  | "intent"
  | "narrative"
  | "shots"
  | "script"
  | "strictScript"
  | "scriptExtension"
  | "safetyPrecheck"
  | "safetyReword"
  | "cartoonSubject"
  | "editInterpretation"
  | "assetAnalysis"
  | "imageQuery"
  | "promptSuggestion";
const ANTHROPIC_STAGE_MODELS: Record<LlmStage, string> = {
  intent: "claude-haiku-5-5",
  narrative: "claude-haiku-5-5",
  shots: "claude-haiku-5-5",
  script: "claude-haiku-5-5",
  strictScript: "claude-haiku-5-5",
  scriptExtension: "claude-haiku-5-5",
  safetyPrecheck: "claude-haiku-5-5",
  safetyReword: "claude-haiku-5-5",
  cartoonSubject: "claude-haiku-5-5",
  editInterpretation: "claude-haiku-5-5",
  assetAnalysis: "claude-haiku-5-5",
  imageQuery: "claude-haiku-5-5",
  promptSuggestion: "claude-haiku-5-5",
};

export const NO_LLM_KEY_MESSAGE = "No LLM API key is set. Add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to .env.local";

const ANTHROPIC_PAUSE_MS = 10 * 60_000;
let anthropicPausedUntil = 0;

function hasKey(name: "ANTHROPIC_API_KEY" | "OPENROUTER_API_KEY"): boolean {
  return Boolean(process.env[name]?.trim());
}

function anthropicIdFor(requestedModel: string): string | null {
  const match = /^anthropic\/(claude-[a-z0-9.-]+)$/i.exec(requestedModel.trim());
  return match ? match[1]!.toLowerCase().replace(/\./g, "-") : null;
}
export function getProviderCandidates(
  stage: LlmStage,
  openRouterModel: string,
  requestedModel?: string
): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  const openRouter = hasKey("OPENROUTER_API_KEY");
  const anthropicModel = requestedModel
    ? anthropicIdFor(requestedModel)
    : process.env.ANTHROPIC_MODEL?.trim() || ANTHROPIC_STAGE_MODELS[stage];
  const paused = openRouter && Date.now() < anthropicPausedUntil;
  if (anthropicModel && hasKey("ANTHROPIC_API_KEY") && !paused) {
    candidates.push({ provider: "anthropic", model: anthropicModel });
  }
  if (openRouter) {
    for (const model of getModelCandidates(openRouterModel)) {
      candidates.push({ provider: "openrouter", model });
    }
  }
  return candidates;
}

function pauseAnthropicAfter(err: unknown): void {
  if (!(err instanceof LlmHttpError)) return;
  const lasting =
    err.status === 401 ||
    err.status === 402 ||
    (err.status === 400 && /credit balance|usage limit|spend limit/i.test(err.message));
  let ms = 0;
  if (lasting) {
    ms = ANTHROPIC_PAUSE_MS;
  } else if (err.status === 429) {
    ms = err.retryAfterSeconds ? Math.min(err.retryAfterSeconds * 1000, ANTHROPIC_PAUSE_MS) : ANTHROPIC_PAUSE_MS;
  }
  if (ms === 0) return;
  anthropicPausedUntil = Math.max(anthropicPausedUntil, Date.now() + ms);
  console.warn(`[llm] Skipping Anthropic for ${Math.round(ms / 1000)}s. ${err.message}`);
}

function describe(candidate: ModelCandidate): string {
  return `${candidate.provider === "anthropic" ? "Anthropic" : "OpenRouter"} (${candidate.model})`;
}
export async function tryModelCandidates<T>(
  candidates: ModelCandidate[],
  logTag: string,
  attempt: (candidate: ModelCandidate) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]!;
    try {
      return await attempt(candidate);
    } catch (err) {
      lastError = err;
      if (candidate.provider === "anthropic") pauseAnthropicAfter(err);
      const next = candidates[i + 1];
      if (!next || (candidate.provider !== "anthropic" && !shouldRetryForLLM(err))) {
        throw err;
      }
      console.warn(
        `[${logTag}] ${describe(candidate)} failed. Falling back to ${describe(next)}. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error(NO_LLM_KEY_MESSAGE);
}
