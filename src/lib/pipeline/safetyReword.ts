const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const userContent = `Rewrite this spoken line so it passes a content-safety filter. Same meaning, same approximate length:\n\n${line}\n\nRewritten line:`;

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
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Safety reword failed: ${response.status}. ${response.status === 401 ? "Check API key." : text || ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Safety reword failed: empty response from model");
  }
  return content.trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
}
