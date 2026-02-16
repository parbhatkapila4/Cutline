import { NextResponse } from "next/server";
import { DURATION_MIN, DURATION_MAX } from "@/lib/validation/duration";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash-lite-001";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const partial = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const refine = Boolean(body.refine);
    const durationSeconds = typeof body.durationSeconds === "number" && body.durationSeconds >= DURATION_MIN && body.durationSeconds <= DURATION_MAX
      ? Math.round(body.durationSeconds)
      : 30;
    const isLongVideo = durationSeconds >= 45;
    const isShortVideo = durationSeconds <= 15;

    const durationGuidance = refine
      ? ` The user's video is set to ${durationSeconds} seconds. Improve the prompt so the resulting script/content would fit this length: ${isShortVideo ? "keep it concise and focused (short video)." : isLongVideo ? "make it rich and detailed so there is enough material for a longer video." : "match the medium length."}`
      : ` The user's video duration is set to ${durationSeconds} seconds. Generate a prompt that will lead to the right amount of content: ${isShortVideo ? "keep the prompt focused and concise so the video stays short (one clear idea, minimal scope)." : isLongVideo ? "make the prompt substantial and detailed so there is enough to say for a long video (multiple points, examples, or a fuller narrative)." : "aim for a medium level of detail suitable for this length."}`;

    const systemPrompt = refine
      ? `You are a helpful assistant for an AI video generation app. The user already has a video description prompt and wants a BETTER version of it. Your job is to improve the given prompt: make it more specific, clearer, more engaging, and better suited for video generation.

Rules:
- Output ONLY the improved prompt text. No quotes, no preamble, no explanation.
- Keep it under 500 characters.
- Improve: add or sharpen tone, style, audience, or visual/audio details; fix vagueness; make it more actionable for video generation.
- Do not make it shorter or generic—make it strictly better than the previous version while keeping the same core idea.
- Do NOT include video length or duration in the output (e.g. no "30-second", "45-second", "1 minute"). Duration is set separately in the app.${durationGuidance}`
      : `You are a helpful assistant for an AI video generation app. The user has started typing a short video description (a few words or a fragment). Your job is to turn it into one complete, specific prompt suitable for video generation.

Rules:
- Output ONLY the expanded prompt text. No quotes, no preamble, no explanation.
- Keep it under 500 characters.
- Be specific: include topic, tone (e.g. professional, upbeat), style, and visual/audio details. Do NOT suggest or include video length or duration—duration is set separately in the app.
- Match the user's intent and expand naturally (e.g. "solar panels" → "Create an explainer about how solar panels work, professional tone with upbeat background music").
- If the input is empty or too vague, suggest a generic but complete prompt like: "Create an explainer about [topic], professional tone with upbeat background music."${durationGuidance}`;

    const userContent = refine
      ? (partial ? `Improve this video prompt (output only the better version). Video duration: ${durationSeconds} seconds.\n\n"${partial}"` : "No prompt provided.")
      : partial
        ? `Expand this into a full video description prompt. Video duration: ${durationSeconds} seconds.\n\n"${partial}"`
        : `The user hasn't typed anything yet. Suggest a complete example prompt for an explainer video (do not include duration or length). Video duration: ${durationSeconds} seconds.`;

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `OpenRouter error: ${response.status}. ${response.status === 401 ? "Check API key." : text || ""}` },
        { status: response.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Empty suggestion from model" },
        { status: 502 }
      );
    }

    const suggestion = content.trim().slice(0, 500);
    return NextResponse.json({ suggestion });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggest prompt failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
