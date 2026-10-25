import type { LlmProvider } from "@/lib/llm/chat";

export type LlmCall = {
  provider: LlmProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  reportedCostUsd?: number;
};

type Rate = { input: number; output: number };
const CLAUDE_RATES: Record<string, Rate> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-opus-4-5": { input: 5, output: 25 },
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
};

const HAIKU_5_5_LONG_PROMPT_TOKENS = 100_000;
const HAIKU_5_5_LONG_PROMPT_RATE: Rate = { input: 0.5, output: 2.5 };
const UNPRICED_RATE: Rate = { input: 10, output: 50 };
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;
const warnedUnpriced = new Set<string>();

export function claudeRateKey(model: string): string {
  return model
    .trim()
    .toLowerCase()
    .replace(/^anthropic\//, "")
    .replace(/:.*$/, "")
    .replace(/\./g, "-")
    .replace(/-\d{8}$/, "");
}

export function llmCallCostUsd(call: LlmCall): number {
  if (call.reportedCostUsd !== undefined && Number.isFinite(call.reportedCostUsd) && call.reportedCostUsd >= 0) {
    return call.reportedCostUsd;
  }
  const cacheWrite = call.cacheWriteTokens ?? 0;
  const cacheRead = call.cacheReadTokens ?? 0;
  const key = claudeRateKey(call.model);
  let rate: Rate | undefined = CLAUDE_RATES[key];
  if (key === "claude-haiku-5-5" && call.inputTokens + cacheWrite + cacheRead > HAIKU_5_5_LONG_PROMPT_TOKENS) {
    rate = HAIKU_5_5_LONG_PROMPT_RATE;
  }
  if (!rate) {
    rate = UNPRICED_RATE;
    if (!warnedUnpriced.has(key)) {
      warnedUnpriced.add(key);
      console.error(
        `[cost] No price for LLM model ${call.model}. Booking it at $${UNPRICED_RATE.input} / $${UNPRICED_RATE.output} ` +
        "per million tokens, the dearest Claude rate, until it is added to src/lib/cost/llmPricing.ts."
      );
    }
  }
  return (
    call.inputTokens * rate.input +
    call.outputTokens * rate.output +
    cacheWrite * rate.input * CACHE_WRITE_MULTIPLIER +
    cacheRead * rate.input * CACHE_READ_MULTIPLIER
  ) / 1_000_000;
}
