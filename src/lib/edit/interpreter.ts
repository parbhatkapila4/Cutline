const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const userContent = `Original prompt: ${originalInput}\n\nUser edit request: ${userMessage}\n\nOutput only the new, single prompt:`;

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Edit interpreter failed: ${response.status}. ${response.status === 401 ? "Check API key." : text || ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Edit interpreter failed: empty response from model");
  }

  return content.trim().slice(0, 500);
}
