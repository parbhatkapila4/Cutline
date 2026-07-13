import type { Intent } from "@/lib/types";
import type { Shot } from "@/lib/types";
import type { Script } from "@/lib/types";
import { extractJsonFromModelOutput } from "@/lib/utils/modelJson";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

export type DeriveResult = {
  searchQuery: string;
  imagePrompt: string;
};

function getScriptTextForShot(script: Script, shotId: string): string {
  const entry = script.entries.find((e) => e.shotId === shotId);
  return entry?.text?.trim() ?? "";
}

export type AlreadyUsedForShots = { searchQuery?: string; imagePrompt?: string }[];

export async function deriveImageQuery(
  shot: Shot,
  script: Script,
  intent: Intent,
  alreadyUsedForOtherShots?: AlreadyUsedForShots
): Promise<DeriveResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const scriptText = getScriptTextForShot(script, shot.id);
  const topic = intent.rawInput;
  const tone = intent.tone;
  const purpose = shot.purpose;

  const systemPrompt = `You are an image search and prompt assistant for a video editing system. Given a shot's purpose, the spoken text for that shot, the video topic, and tone, output exactly two strings:
1. searchQuery: 3-6 words for stock photo search. MUST be directly about the video topic. Include the main subject from the topic in every query (e.g. topic "soda soft drinks" → "soda drink can", "soft drink bottle", "refreshing soda pour"). Never return generic or off-topic queries. Every image in the video must match the user's description/topic.
2. imagePrompt: one short sentence for image generation. MUST depict the video topic clearly. The image must look like it belongs in a video about this topic. No markdown, no explanation. Output only valid JSON with keys searchQuery and imagePrompt.`;

  let userPrompt = `Video topic (ALL images must relate to this): "${topic}". Shot purpose: ${purpose}. Script for this shot: "${scriptText}". Tone: ${tone}. Return searchQuery and imagePrompt that are clearly about "${topic}".`;
  if (alreadyUsedForOtherShots && alreadyUsedForOtherShots.length > 0) {
    const usedList = alreadyUsedForOtherShots
      .slice(-8)
      .map((u) => `search: "${u.searchQuery ?? ""}" / prompt: "${(u.imagePrompt ?? "").slice(0, 60)}..."`)
      .join("; ");
    userPrompt += ` Already used for other shots in this video (suggest a DIFFERENT scene, angle, or composition-do not repeat): ${usedList}. Return a NEW searchQuery and imagePrompt that are still about "${topic}" but visually different from the above.`;
  }

  const body = {
    model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ],
    temperature: 0,
    max_tokens: 1024,
    response_format: { type: "json_object" as const },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
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
      `Query derivation failed: ${response.status}. ${response.status === 401 ? "Check your API key." : text || ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Query derivation returned empty content");
  }

  let parsed: { searchQuery?: string; imagePrompt?: string };
  try {
    parsed = JSON.parse(extractJsonFromModelOutput(raw)) as { searchQuery?: string; imagePrompt?: string };
  } catch {
    throw new Error("Query derivation returned invalid JSON");
  }

  let searchQuery =
    typeof parsed.searchQuery === "string" && parsed.searchQuery.trim()
      ? parsed.searchQuery.trim()
      : fallbackSearchQuery(purpose, scriptText, topic);
  let imagePrompt =
    typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()
      ? parsed.imagePrompt.trim()
      : fallbackImagePrompt(purpose, scriptText, topic);

  const topicPrefix = topic.trim().split(/\s+/).slice(0, 4).join(" ").trim();
  if (topicPrefix) {
    const t = topicPrefix.toLowerCase();
    if (!searchQuery.toLowerCase().startsWith(t)) {
      searchQuery = (topicPrefix + " " + searchQuery).trim();
    }
    if (!imagePrompt.toLowerCase().startsWith(t)) {
      imagePrompt = (topicPrefix + ". " + imagePrompt).trim();
    }
  }
  searchQuery = searchQuery.slice(0, 80);
  imagePrompt = imagePrompt.slice(0, 500);

  return { searchQuery, imagePrompt };
}

function fallbackSearchQuery(
  purpose: string,
  scriptText: string,
  topic: string
): string {
  const words = [...topic.split(/\s+/).slice(0, 3), purpose, scriptText.split(/\s+/).slice(0, 2)].flat().filter(Boolean);
  return words.slice(0, 5).join(" ") || "abstract visual";
}

function fallbackImagePrompt(
  purpose: string,
  scriptText: string,
  topic: string
): string {
  return `Scene for "${topic}": ${scriptText || purpose}. Clean, professional.`;
}
