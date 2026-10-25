import { describe, it, expect, vi, afterEach } from "vitest";
import { claudeRateKey, llmCallCostUsd } from "./llmPricing";
import { createCostTracker } from "./costEstimator";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("llmCallCostUsd", () => {
  it("prices Claude Haiku 5.5 at $0.10 in and $0.50 out per million tokens", () => {
    const usd = llmCallCostUsd({ provider: "anthropic", model: "claude-haiku-5-5", inputTokens: 50_000, outputTokens: 10_000 });
    expect(usd).toBeCloseTo(0.01, 10);
  });

  it("prices a Haiku 5.5 prompt over 100,000 tokens at $0.50 / $2.50", () => {
    const usd = llmCallCostUsd({ provider: "anthropic", model: "claude-haiku-5-5", inputTokens: 200_000, outputTokens: 10_000 });
    expect(usd).toBeCloseTo(0.1 + 0.025, 10);
  });

  it("prices a dated ID and an OpenRouter slug like the model they name", () => {
    expect(claudeRateKey("claude-haiku-4-5-20251001")).toBe("claude-haiku-4-5");
    expect(claudeRateKey("anthropic/claude-haiku-4.5")).toBe("claude-haiku-4-5");
    for (const model of ["claude-haiku-4-5", "claude-haiku-4-5-20251001", "anthropic/claude-haiku-4.5"]) {
      expect(llmCallCostUsd({ provider: "anthropic", model, inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(6, 10);
    }
  });

  it("prices cache writes at 1.25x and cache hits at 0.1x the input rate", () => {
    const usd = llmCallCostUsd({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
    });
    expect(usd).toBeCloseTo(1.25 + 0.1, 10);
  });

  it("uses OpenRouter's own figure for a call when it reports one", () => {
    const usd = llmCallCostUsd({
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      reportedCostUsd: 0.0042,
    });
    expect(usd).toBe(0.0042);
  });

  it("never books an unpriced model at $0: it uses the dearest Claude rate and says so once", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const call = { provider: "anthropic" as const, model: "claude-unreleased-9", inputTokens: 1_000_000, outputTokens: 1_000_000 };

    expect(llmCallCostUsd(call)).toBeCloseTo(10 + 50, 10);
    expect(llmCallCostUsd(call)).toBeCloseTo(60, 10);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![0]).toContain("No price for LLM model claude-unreleased-9");
  });
});

describe("the job's cost tracker", () => {
  it("adds up every LLM call into the llm line and the total", () => {
    const tracker = createCostTracker();
    tracker.recordLlmCall({ provider: "anthropic", model: "claude-haiku-5-5", inputTokens: 50_000, outputTokens: 10_000 });
    tracker.recordLlmCall({ provider: "openrouter", model: "anthropic/claude-haiku-4.5", inputTokens: 1_000, outputTokens: 100, reportedCostUsd: 0.0015 });

    expect(tracker.getBreakdown()).toEqual({ llm: 0.0115, tts: 0, video: 0, images: 0, total: 0.0115 });
  });
});
