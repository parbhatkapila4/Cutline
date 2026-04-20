import type { Intent } from "@/lib/types/intent";
import type { NarrativePlan } from "@/lib/types/narrative";
import type { ShotList } from "@/lib/types/shots";
import type { Script } from "@/lib/types/script";
import { parseAndValidateScript } from "@/lib/pipeline/script";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";

/**
 * Maps user-provided compliance copy to shot boundaries without rewriting wording
 * (aside from trimming whitespace per shot).
 */
export async function mapStrictScriptToShots(
  intent: Intent,
  plan: NarrativePlan,
  shotList: ShotList,
  strictScript: string,
  model?: string
): Promise<Script> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const m = model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
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

  const url = `${OPENROUTER_BASE}/chat/completions`;
  const body = {
    model: m,
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
    ],
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" as const },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Strict script mapping failed: API returned ${response.status}. ${text || ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Strict script mapping failed: empty model response");
  }

  return parseAndValidateScript(content.trim(), shotList, {
    fidelity: "strict",
    strictSourceText: strictScript,
  });
}
