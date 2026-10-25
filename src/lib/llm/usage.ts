import { AsyncLocalStorage } from "node:async_hooks";
import type { LlmCall } from "@/lib/cost/llmPricing";

type LlmCallSink = { recordLlmCall(call: LlmCall): void };

const currentSink = new AsyncLocalStorage<LlmCallSink>();

export function withLlmCostTracking<T>(sink: LlmCallSink, run: () => Promise<T>): Promise<T> {
  return currentSink.run(sink, run);
}

export function recordLlmCall(call: LlmCall): void {
  currentSink.getStore()?.recordLlmCall(call);
}
