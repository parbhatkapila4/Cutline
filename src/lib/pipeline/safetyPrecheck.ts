import { getProviderCandidates, tryModelCandidates } from "@/lib/pipeline/modelFallback";
import { requestChat } from "@/lib/llm/chat";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";


const SYSTEM_PROMPT = `You screen short lines of spoken video narration for an automated Responsible-AI filter used by an AI VIDEO generator. You do not rewrite anything. You only judge which lines are likely to be BLOCKED.

Lines are commonly blocked for: real, identifiable or named people (public figures, celebrities, politicians); violence, weapons or self-harm; hate or harassment; sexual content; graphic medical content; illegal activity; explicit brand names.

Be precise, not squeamish. Ordinary commercial, educational and product narration is fine and must NOT be flagged. Flag only lines with a genuine, specific trigger.

Reply with ONLY a JSON object of the form {"flagged":[0,3]} listing the zero-based indexes of the lines likely to be blocked. If none are, reply {"flagged":[]}. No prose, no code fences.`;

export type SafetyPrecheckOptions = { model?: string };

export function isSafetyPrecheckEnabled(): boolean {
  const raw = process.env.VEO_SAFETY_PRECHECK?.trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

export function parseFlagged(content: string, total: number): number[] {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  const raw = (parsed as { flagged?: unknown })?.flagged;
  if (!Array.isArray(raw)) return [];
  const out = new Set<number>();
  for (const v of raw) {
    let n: number;
    if (typeof v === "number") n = v;
    else if (typeof v === "string" && v.trim() !== "") n = Number(v);
    else continue;
    if (Number.isInteger(n) && n >= 0 && n < total) out.add(n);
  }
  return [...out];
}


export async function precheckChunksForSafety(
  chunks: string[],
  options?: SafetyPrecheckOptions
): Promise<boolean[]> {
  const verdict = new Array<boolean>(chunks.length).fill(false);
  if (chunks.length === 0) return verdict;

  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const candidates = getProviderCandidates("safetyPrecheck", model, options?.model);
  if (candidates.length === 0) return verdict;

  const numbered = chunks.map((c, i) => `${i}: ${c}`).join("\n");
  const userContent = `Screen these ${chunks.length} narration lines. Reply with the JSON object only.\n\n${numbered}`;

  try {
    const content = await tryModelCandidates(candidates, "safety-precheck", (candidate) =>
      requestChat(
        candidate,
        { system: SYSTEM_PROMPT, user: userContent, temperature: 0, maxTokens: 200, timeoutMs: 20_000 },
        "Safety precheck"
      )
    );
    for (const i of parseFlagged(content, chunks.length)) verdict[i] = true;
    return verdict;
  } catch (e) {
    console.warn(
      "[safety-precheck] skipped:",
      e instanceof Error ? e.message : String(e)
    );
    return verdict;
  }
}
