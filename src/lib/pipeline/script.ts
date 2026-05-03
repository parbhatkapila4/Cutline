import type { Intent, NarrativePlan, ShotList } from "@/lib/types";
import type { Script, ScriptEntry } from "@/lib/types";
import { getVariationPromptSnippet } from "@/lib/variation/strategies";
import type { Platform } from "@/lib/platform/types";
import { getPlatformPromptSnippet } from "@/lib/platform/platformStrategy";
import type { BrandBrainInput } from "@/lib/types/pipelineEnhancements";
import { shouldRetryForLLM } from "@/lib/utils/retry";
import { getModelCandidates } from "@/lib/pipeline/modelFallback";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";

const BASE_SYSTEM_PROMPT = `You are a script writer for a short video. Structure (beats, shots) is already decided. You fill each shot with spoken text or silence.

Given Intent, NarrativePlan, and ShotList, output a single JSON object with exactly one key:
- entries: array of script entries, one per shot, in shot order (order 1, 2, 3, ...). Each entry has:
  - shotId: string (must match the shot id from ShotList)
  - text: string or null. Use null ONLY when the shot has textDensity 0 (silence). For every shot with textDensity > 0 you MUST provide a non-empty text string-one short sentence of dialogue. Text must never be null or omitted for those shots.
  - order: number (same as shot order, 1-based)

CRITICAL - Stay on topic: Every spoken line must be ABOUT the topic in intent.rawInput. If the user asked for an energy drink video, every line must relate to energy drinks (e.g. taste, energy, brand, why try it). If they asked for a product or brand, every line must be about that product/brand. Never write generic, negative, or off-topic content. Keep it positive and on-brand for what the user asked for.

Rules:
- For shots with textDensity > 0: every entry must have a non-empty text string (one short sentence of dialogue). Never output null or omit text for those shots.
- Max one sentence per shot when text is not null.
- Natural, conversational tone. Match intent.tone and shot emotionalIntent.
- Text must align with shot purpose (establish, reveal, emphasize, transition, hold) and the video intent (intent.rawInput).
- No bullet points, no lists in spoken text.
- Silence (null) is valid only for shots where textDensity is 0.

Output only valid JSON.`;

function buildSystemPrompt(options?: {
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  variationStrategy?: string;
  platform?: Platform;
  brandBrain?: BrandBrainInput;
  locale?: string;
}): string {
  let prompt = BASE_SYSTEM_PROMPT;
  const variationSnippet = options?.variationStrategy
    ? getVariationPromptSnippet(options.variationStrategy, "script")
    : "";
  if (variationSnippet) prompt += variationSnippet;
  const platformSnippet =
    options?.platform && options.platform !== "general"
      ? getPlatformPromptSnippet(options.platform, "script")
      : "";
  if (platformSnippet) prompt += platformSnippet;

  const loc = options?.locale?.trim();
  if (loc && loc.toLowerCase() !== "en" && !loc.toLowerCase().startsWith("en-")) {
    prompt += `

LOCALIZATION: Write every spoken line in the language/locale "${loc}" (natural native phrasing).`;
  }

  const bb = options?.brandBrain;
  if (bb?.bannedPhrases?.length) {
    prompt += `

BRAND POLICY: Do not use these phrases anywhere in dialogue: ${bb.bannedPhrases.map((p) => JSON.stringify(p)).join(", ")}`;
  }
  if (bb?.requiredPhrases?.length) {
    prompt += `

BRAND POLICY: You must include each of these phrases verbatim somewhere in the spoken script: ${bb.requiredPhrases.map((p) => JSON.stringify(p)).join(", ")}`;
  }
  if (bb?.voiceTone?.trim()) {
    prompt += `

VOICE / TONE OVERRIDE: ${bb.voiceTone.trim()}`;
  }

  const durationSec = options?.durationSeconds;
  const hasTargetDuration =
    durationSec != null &&
    !Number.isNaN(Number(durationSec)) &&
    Number(durationSec) >= 15;
  if (hasTargetDuration) {
    const sec = Math.round(Number(durationSec));
    const targetWords = Math.round(sec * 2.5);
    const minWords = Math.max(20, targetWords - 40);
    const maxWords = targetWords + 50;
    prompt += `

TARGET LENGTH (CRITICAL): The user chose a video duration of ${sec} seconds. The total word count of ALL spoken dialogue (sum of words in every entries[].text) MUST be approximately ${targetWords} words (between ${minWords} and ${maxWords}). At ~2.5 words per second, this fills the full ${sec} seconds with voice. Write enough substantive sentences per shot-longer sentences where needed-so the combined dialogue reaches this word count. Short scripts produce short audio and break caption sync; always hit the target word range.`;

    const endingStartSec = Math.max(1, sec - 2);
    prompt += `

INTRO AND OUTRO (required): The video must have a clear beginning and a proper ending so it does not feel cut off.
- Intro (first 1-2 shots): Write dialogue that works as a proper intro-e.g. a welcome, a hook, or what this video is about.
- Outro (CRITICAL-last 2 seconds only): For a ${sec}-second video the ending must be COMPLETE by second ${sec - 1} (e.g. 59 for 60s). So the very last sentence of the entire script MUST be 3-5 words ONLY (e.g. "Thanks for watching!", "Stay refreshed!", "Try it today!"). No long sentence in the final shot. This short line must be the ONLY dialogue in the last shot and must be spoken in full within seconds ${endingStartSec}-${sec}. All other dialogue must fit in the first ${sec - 2} seconds so the last 2 seconds contain only this one short sign-off. The video must not cut off mid-word-the final line must be complete.`;
  }
  return prompt;
}

export type ParseScriptOptions = {
  fidelity?: "creative" | "strict";
  strictSourceText?: string;
};

function normalizeForStrictCheck(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

export function parseAndValidateScript(
  raw: string,
  shotList: ShotList,
  parseOptions?: ParseScriptOptions
): Script {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Script generation failed: invalid JSON from model");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Script generation failed: expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;

  const entriesRaw = obj.entries;
  if (!Array.isArray(entriesRaw)) {
    throw new Error("Script generation failed: entries must be an array");
  }

  const shotById = new Map(shotList.shots.map((s) => [s.id, s]));
  const TEXT_PLACEHOLDER = "...";
  const entryByShotId = new Map<string, Record<string, unknown>>();
  for (const item of entriesRaw) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) continue;
    const e = item as Record<string, unknown>;
    const shotIdRaw = e.shotId;
    if (typeof shotIdRaw !== "string" || shotIdRaw.trim() === "") continue;
    const shotId = shotIdRaw.trim();
    if (!shotById.has(shotId) || entryByShotId.has(shotId)) continue;
    entryByShotId.set(shotId, e);
  }

  if (entryByShotId.size === 0 && entriesRaw.length > 0) {
    throw new Error(
      "Script generation failed: no entries matched shot ids (check model output shotId fields)"
    );
  }

  const entries: ScriptEntry[] = shotList.shots.map((shot) => {
    const e = entryByShotId.get(shot.id);
    const text = e?.text;

    if (shot.textDensity === 0) {
      return { shotId: shot.id, text: null, order: shot.order };
    }

    let str: string;
    if (text != null && typeof text === "string") {
      str = text.trim();
    } else {
      str = "";
    }
    const strict = parseOptions?.fidelity === "strict";
    if (str.length === 0) {
      if (strict) {
        throw new Error(
          "Strict script mode: every speaking shot must have text taken from your provided script."
        );
      }
      str = TEXT_PLACEHOLDER;
    }
    return { shotId: shot.id, text: str, order: shot.order };
  });

  entries.sort((a, b) => a.order - b.order);

  if (parseOptions?.fidelity === "strict" && parseOptions.strictSourceText) {
    const pool = normalizeForStrictCheck(parseOptions.strictSourceText);
    for (const e of entries) {
      if (e.text == null || e.text.trim() === "") continue;
      const shot = shotList.shots.find((s) => s.id === e.shotId);
      if (shot && shot.textDensity === 0) continue;
      const n = normalizeForStrictCheck(e.text);
      if (n.length > 0 && !pool.includes(n)) {
        throw new Error(
          "Strict script mode: a line was not found verbatim within your provided script. Check whitespace or re-paste the exact copy."
        );
      }
    }
  } else {
    const MAX_LAST_SENTENCE_WORDS = 5;
    const lastEntry = entries[entries.length - 1];
    if (lastEntry?.text != null && lastEntry.text.trim() !== "") {
      const words = lastEntry.text.trim().split(/\s+/).filter(Boolean);
      if (words.length > MAX_LAST_SENTENCE_WORDS) {
        lastEntry.text = words.slice(0, MAX_LAST_SENTENCE_WORDS).join(" ").replace(/[.,;:]$/, "") + "!";
      }
    }
  }

  return { entries };
}

export type GenerateScriptOptions = {
  mode?: "slideshow" | "talking_object";
  durationSeconds?: number;
  model?: string;
  variationStrategy?: string;
  platform?: Platform;
  brandBrain?: BrandBrainInput;
  locale?: string;
  jobId?: string;
};

async function requestScriptFromModel(
  shotList: ShotList,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string,
  isTalkingObject: boolean
): Promise<Script> {
  const url = `${OPENROUTER_BASE}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userContent },
    ],
    temperature: isTalkingObject ? 0.65 : 0,
    max_tokens: 4096,
    response_format: { type: "json_object" as const },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

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
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Script generation timed out. Try again.");
      }
      throw new Error(`Script generation failed: ${err.message}`);
    }
    throw new Error("Script generation failed: unknown error");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Script generation failed: API returned ${response.status}. ${response.status === 401 ? "Check your API key." : text || ""}`
    );
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Script generation failed: invalid response from API");
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Script generation failed: empty response from model");
  }

  return parseAndValidateScript(content.trim(), shotList);
}

export async function generateScript(
  intent: Intent,
  plan: NarrativePlan,
  shotList: ShotList,
  options?: GenerateScriptOptions
): Promise<Script> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const primaryModel = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const systemPrompt = buildSystemPrompt({
    mode: options?.mode,
    durationSeconds: options?.durationSeconds,
    variationStrategy: options?.variationStrategy,
    platform: options?.platform,
    brandBrain: options?.brandBrain,
    locale: options?.locale,
  });
  const n = shotList.shots.length;

  const isTalkingObject = options?.mode === "talking_object";
  const seed = options?.jobId
    ? options.jobId.slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  const variationDirective = isTalkingObject
    ? `

CREATIVE VARIATION (run seed: ${seed}):
- This is a talking-photo avatar delivery. Write the script as if a real, charismatic person were speaking it on camera.
- Vary the opening hook, phrasing, sentence rhythm and connective beats slightly compared to a generic version of the same idea, but keep meaning, structure and shot count exactly aligned.
- Prefer natural spoken cadence (contractions, short clauses, mid-sentence pivots) over formal written prose.
- Add micro-cues for delivery in punctuation only: commas for breath, em-dashes for emphasis, ellipses sparingly for pauses. Never add stage directions or brackets.`
    : "";
  const userContent = `${JSON.stringify({ intent, plan, shotList })}${variationDirective}

CRITICAL: shotList.shots has exactly ${n} items. Your "entries" array MUST have exactly ${n} objects, in the same order as shots (order 1..${n}). Each entry.shotId must equal shotList.shots[i].id for that index. Do not merge shots, skip shots, or add extra entries.`;
  const modelCandidates = getModelCandidates(primaryModel);

  let lastError: unknown;
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i]!;
    try {
      return await requestScriptFromModel(
        shotList,
        apiKey,
        model,
        systemPrompt,
        userContent,
        isTalkingObject
      );
    } catch (err) {
      lastError = err;
      const shouldFallback = shouldRetryForLLM(err);
      const hasNext = i < modelCandidates.length - 1;
      if (!shouldFallback || !hasNext) {
        throw err;
      }
      console.warn(
        `[script] Primary model failed (${model}). Falling back to ${modelCandidates[i + 1]}. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Script generation failed");
}

const EXTEND_SCRIPT_SYSTEM_PROMPT = `You extend a video script with new dialogue. You will be given the current script, the video topic, tone, and how many more words to add.

Rules:
- Output ONLY the new sentences-no repetition of the existing script, no preamble, no "Here is more dialogue:".
- Same topic and tone as the original. Stay on topic (match the user's intent).
- Natural, conversational. One or more short sentences that continue the video.
- End your added lines with a complete sentence (. ? !)-nothing dangling mid-thought-so the clip can end cleanly.
- Plain text only. No JSON, no bullet points, no labels.`;

export type ExtendScriptOptions = { model?: string };

export async function extendScript(
  currentScriptText: string,
  intent: Intent,
  additionalWords: number,
  options?: ExtendScriptOptions
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const primaryModel = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    return "";
  }

  const targetWords = Math.max(20, Math.min(additionalWords + 40, 300));
  const userContent = `Topic: ${intent.rawInput}
Tone: ${intent.tone}

Current script (do not repeat any of this):
---
${currentScriptText.trim()}
---

Write approximately ${targetWords} words of NEW dialogue on the same topic, same tone. Do not repeat any line from the current script. Output only the new sentences.`;

  const modelCandidates = getModelCandidates(primaryModel);
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i]!;
    const url = `${OPENROUTER_BASE}/chat/completions`;
    const body = {
      model,
      messages: [
        { role: "system" as const, content: EXTEND_SCRIPT_SYSTEM_PROMPT },
        { role: "user" as const, content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 512,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = new Error(`Script extension failed: API returned ${response.status}`);
        const shouldFallback = shouldRetryForLLM(err) && i < modelCandidates.length - 1;
        if (!shouldFallback) return "";
        continue;
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string") return "";
      const trimmed = content.trim();
      if (trimmed.length > 0) return trimmed;
      return "";
    } catch (err) {
      clearTimeout(timeoutId);
      const shouldFallback = shouldRetryForLLM(err) && i < modelCandidates.length - 1;
      if (!shouldFallback) return "";
    }
  }
  return "";
}
