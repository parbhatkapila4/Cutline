import { NO_LLM_KEY_MESSAGE, getProviderCandidates, tryModelCandidates } from "@/lib/pipeline/modelFallback";
import { requestChat } from "@/lib/llm/chat";

const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `You are an edit interpreter for a video generation system. You are given:
1. The original video prompt (what the current video was generated from).
2. The user's edit request (e.g. tone change, add content, regenerate, more info on X).

Your task: Output a single, concise prompt that incorporates the user's request. The output will be used as the new input for a full video regeneration-so it must be a complete, standalone prompt (one sentence or short paragraph), not a diff or instruction.

Rules:
- Output ONLY the new prompt text. No quotes, no preamble, no explanation.
- If the user asks for "regenerate" or "whole video", produce a refreshed version of the original idea.
- If the user asks for tone/style changes, add content, or "more info on X", merge that into one coherent prompt.
- Keep it under 500 characters and suitable for the same video pipeline.`;

export type InterpretEditOptions = { model?: string };

export async function interpretEdit(
  originalInput: string,
  userMessage: string,
  options?: InterpretEditOptions
): Promise<string> {
  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const candidates = getProviderCandidates("editInterpretation", model, options?.model);
  if (candidates.length === 0) {
    throw new Error(NO_LLM_KEY_MESSAGE);
  }

  const userContent = `Original prompt: ${originalInput}\n\nUser edit request: ${userMessage}\n\nOutput only the new, single prompt:`;

  const content = await tryModelCandidates(candidates, "edit-interpreter", (candidate) =>
    requestChat(
      candidate,
      { system: SYSTEM_PROMPT, user: userContent, temperature: 0.4, maxTokens: 400, timeoutMs: 30_000 },
      "Edit interpreter"
    )
  );
  return content.trim().slice(0, 500);
}
