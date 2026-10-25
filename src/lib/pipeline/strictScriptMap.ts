import type { Intent } from "@/lib/types/intent";
import type { NarrativePlan } from "@/lib/types/narrative";
import type { ShotList } from "@/lib/types/shots";
import type { Script } from "@/lib/types/script";
import { parseAndValidateScript } from "@/lib/pipeline/script";
import { NO_LLM_KEY_MESSAGE, getProviderCandidates, tryModelCandidates } from "@/lib/pipeline/modelFallback";
import { requestChat } from "@/lib/llm/chat";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";
export async function mapStrictScriptToShots(
  intent: Intent,
  plan: NarrativePlan,
  shotList: ShotList,
  strictScript: string,
  model?: string
): Promise<Script> {
  const primaryModel = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const candidates = getProviderCandidates("strictScript", primaryModel, model);
  if (candidates.length === 0) {
    throw new Error(NO_LLM_KEY_MESSAGE);
  }

  const system = `You assign pre-written spoken text to video shots. The user script is FIXED: you must NOT rewrite, paraphrase, summarize, or invent new marketing copy.

Rules:
- Split and assign the user's text across shots in order (shot order 1..N).
- For shots with textDensity 0 in shotList, use null for text (silence).
- For other shots, each entry.text must be copied verbatim from the user's script (only trim leading/trailing whitespace). You may split one sentence across shots only by cutting at natural clause boundaries, still using ONLY words from the user script.
- Do not add hooks, CTAs, or sentences not present in the user script.
- If the user script is too short for all speaking shots, repeat is NOT allowed. Distribute what exists and leave later speaking shots with the minimal remaining substring (may be short).
- Output JSON: { "entries": [ { "shotId", "text"|null, "order" } ] } with exactly one entry per shot in shot order.

If impossible to satisfy without inventing text, still output best-effort assignment using ONLY substrings of the user script.`;

  const user = `USER SCRIPT (fixed wording, use only this text):
---
${strictScript.trim()}
---

CONTEXT (for structure only, do not copy topic phrases into script unless they appear above):
${JSON.stringify({ intent: { rawInput: intent.rawInput, tone: intent.tone }, plan, shotList })}

Remember: entries[].text must be exact substrings assembled from the USER SCRIPT only (or null for silence shots).`;

  return tryModelCandidates(candidates, "strict-script-map", async (candidate) => {
    const content = await requestChat(
      candidate,
      { system, user, temperature: 0, maxTokens: 4096, json: true, timeoutMs: 60_000 },
      "Strict script mapping"
    );
    return parseAndValidateScript(content.trim(), shotList, {
      fidelity: "strict",
      strictSourceText: strictScript,
    });
  });
}
