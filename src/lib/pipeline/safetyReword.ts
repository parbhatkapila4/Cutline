import { cleanSpokenText } from "@/lib/pipeline/spokenText";
import { NO_LLM_KEY_MESSAGE, getProviderCandidates, tryModelCandidates } from "@/lib/pipeline/modelFallback";
import { requestChat } from "@/lib/llm/chat";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `You rewrite ONE line of spoken video narration so it passes an automated content-safety / Responsible-AI filter for AI video generation, while preserving the original meaning and length.

Rules:
- Output ONLY the rewritten line. No quotes, no preamble, no notes.
- Keep the same meaning, key facts, and roughly the same word count (the line is timed to on-screen video).
- Neutralize anything that commonly trips safety filters: references to real, identifiable or named people (public figures, celebrities, politicians), violence or self-harm, hate or harassment, sexual content, graphic medical content, and explicit brand names. Replace a named real person with a neutral description of their role.
- Keep it natural, spoken, and plain. No disclaimers, no meta commentary.
- Even if the line already seems safe, rewrite it with meaningfully different wording — the filter may have flagged it by mistake, and a fresh phrasing gives a new attempt. NEVER return the input verbatim.`;

export type RewriteForSafetyOptions = { model?: string };

export async function rewriteNarrationForSafety(
  line: string,
  options?: RewriteForSafetyOptions
): Promise<string> {
  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const candidates = getProviderCandidates("safetyReword", model, options?.model);
  if (candidates.length === 0) {
    throw new Error(NO_LLM_KEY_MESSAGE);
  }

  const userContent = `Rewrite this spoken line so it passes a content-safety filter. Same meaning, same approximate length:\n\n${line}\n\nRewritten line:`;

  const content = await tryModelCandidates(candidates, "safety-reword", (candidate) =>
    requestChat(
      candidate,
      { system: SYSTEM_PROMPT, user: userContent, temperature: 0.7, maxTokens: 300, timeoutMs: 30_000 },
      "Safety reword"
    )
  );
  return cleanSpokenText(content.trim().replace(/^["'“”]+|["'“”]+$/g, ""));
}
