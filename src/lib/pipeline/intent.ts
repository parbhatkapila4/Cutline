import type { Intent } from "@/lib/types";
import type { Platform } from "@/lib/platform/types";
import { getPlatformPromptSnippet } from "@/lib/platform/platformStrategy";
import {
  INTENT_DURATION_MAX,
  INTENT_DURATION_MIN,
  type IntentAudience,
  type IntentComplexity,
  type IntentGoal,
  type IntentTone,
} from "@/lib/types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";

const SYSTEM_PROMPT = `You are an intent interpreter for a video editing system. Given one sentence from the user, output a single JSON object with exactly these keys and types (no other keys, no markdown, no explanation):

- audience: one of "broad" | "technical" | "casual"
- goal: one of "explain" | "persuade" | "entertain"
- tone: one of "serious" | "playful" | "urgent"
- complexity: one of "simple" | "multi-part"
- durationSeconds: number between ${INTENT_DURATION_MIN} and ${INTENT_DURATION_MAX} (infer from the sentence if mentioned, otherwise use ${INTENT_DURATION_MAX})
- rawInput: the exact original user sentence as a string
- mainSubject: string or null - From the user sentence, identify the main subject/object the video is about or that is "talking". Use a short, single noun or noun phrase (e.g. "football", "energy drink", "coffee cup"). If the sentence does not describe a talking object or clear main subject, set mainSubject to null.

Identify the main topic or product (e.g. energy drink, coffee, app, brand). The entire video-script, narrative, and visuals-must be about this topic. Infer audience, goal, tone, and complexity from the sentence. Output only valid JSON.`;

function isIntentAudience(s: string): s is IntentAudience {
  return s === "broad" || s === "technical" || s === "casual";
}
function isIntentGoal(s: string): s is IntentGoal {
  return s === "explain" || s === "persuade" || s === "entertain";
}
function isIntentTone(s: string): s is IntentTone {
  return s === "serious" || s === "playful" || s === "urgent";
}
function isIntentComplexity(s: string): s is IntentComplexity {
  return s === "simple" || s === "multi-part";
}

function parseAndValidateIntent(raw: string, rawInput: string): Intent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Intent interpretation failed: invalid JSON from model");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Intent interpretation failed: expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;

  const audience = obj.audience;
  const goal = obj.goal;
  const tone = obj.tone;
  const complexity = obj.complexity;
  const durationSeconds = obj.durationSeconds;
  const mainSubject = obj.mainSubject;

  if (typeof audience !== "string" || !isIntentAudience(audience)) {
    throw new Error(
      "Intent interpretation failed: invalid or missing audience (expected broad | technical | casual)"
    );
  }
  if (typeof goal !== "string" || !isIntentGoal(goal)) {
    throw new Error(
      "Intent interpretation failed: invalid or missing goal (expected explain | persuade | entertain)"
    );
  }
  if (typeof tone !== "string" || !isIntentTone(tone)) {
    throw new Error(
      "Intent interpretation failed: invalid or missing tone (expected serious | playful | urgent)"
    );
  }
  if (typeof complexity !== "string" || !isIntentComplexity(complexity)) {
    throw new Error(
      "Intent interpretation failed: invalid or missing complexity (expected simple | multi-part)"
    );
  }
  const duration =
    typeof durationSeconds === "number"
      ? Math.round(durationSeconds)
      : typeof durationSeconds === "string"
        ? parseInt(durationSeconds, 10)
        : NaN;
  if (Number.isNaN(duration) || duration < INTENT_DURATION_MIN || duration > INTENT_DURATION_MAX) {
    throw new Error(
      `Intent interpretation failed: durationSeconds must be a number between ${INTENT_DURATION_MIN} and ${INTENT_DURATION_MAX}`
    );
  }

  let parsedMainSubject: string | null = null;
  if (typeof mainSubject === "string" && mainSubject.trim() !== "") {
    parsedMainSubject = mainSubject.trim().slice(0, 50);
  }

  return {
    audience,
    goal,
    tone,
    complexity,
    durationSeconds: duration,
    rawInput,
    mainSubject: parsedMainSubject,
  };
}

export type InterpretIntentOptions = { model?: string; platform?: Platform };

export async function interpretIntent(
  input: string,
  options?: InterpretIntentOptions
): Promise<Intent> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const platformSnippet =
    options?.platform && options.platform !== "general"
      ? getPlatformPromptSnippet(options.platform, "intent")
      : "";
  const systemContent = SYSTEM_PROMPT + platformSnippet;

  const url = `${OPENROUTER_BASE}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "system" as const, content: systemContent },
      { role: "user" as const, content: input },
    ],
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" as const },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

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
        throw new Error("Intent interpretation timed out. Try again.");
      }
      throw new Error(`Intent interpretation failed: ${err.message}`);
    }
    throw new Error("Intent interpretation failed: unknown error");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Intent interpretation failed: API returned ${response.status}. ${response.status === 401 ? "Check your API key." : text || ""}`
    );
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Intent interpretation failed: invalid response from API");
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Intent interpretation failed: empty response from model");
  }

  return parseAndValidateIntent(content.trim(), input);
}
