import type { Intent } from "@/lib/types";
import type { Platform } from "@/lib/platform/types";
import { getPlatformPromptSnippet } from "@/lib/platform/platformStrategy";
import { shouldRetryForLLM } from "@/lib/utils/retry";
import { getModelCandidates } from "@/lib/pipeline/modelFallback";
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

function normalizeAudience(value: unknown): IntentAudience {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (isIntentAudience(v)) return v;
    if (v === "general" || v === "public" || v === "mass") return "broad";
    if (v === "pro" || v === "professional" || v === "expert") return "technical";
    if (v === "friendly" || v === "informal") return "casual";
  }
  return "broad";
}

function normalizeGoal(value: unknown): IntentGoal {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (isIntentGoal(v)) return v;
    if (v === "educate" || v === "inform" || v === "teach") return "explain";
    if (v === "sell" || v === "convert" || v === "promote" || v === "market") return "persuade";
    if (v === "fun" || v === "engage" || v === "viral") return "entertain";
  }
  return "explain";
}

function normalizeTone(value: unknown): IntentTone {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (isIntentTone(v)) return v;
    if (
      v === "professional" ||
      v === "formal" ||
      v === "neutral" ||
      v === "confident" ||
      v === "trustworthy"
    ) {
      return "serious";
    }
    if (
      v === "friendly" ||
      v === "casual" ||
      v === "fun" ||
      v === "light" ||
      v === "humorous" ||
      v === "upbeat"
    ) {
      return "playful";
    }
    if (
      v === "excited" ||
      v === "energetic" ||
      v === "high-energy" ||
      v === "motivational" ||
      v === "action"
    ) {
      return "urgent";
    }
  }
  return "serious";
}

function normalizeComplexity(value: unknown): IntentComplexity {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (isIntentComplexity(v)) return v;
    if (v === "complex" || v === "detailed" || v === "advanced") return "multi-part";
    if (v === "basic" || v === "short" || v === "quick") return "simple";
  }
  return "simple";
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

  const audience = normalizeAudience(obj.audience);
  const goal = normalizeGoal(obj.goal);
  const tone = normalizeTone(obj.tone);
  const complexity = normalizeComplexity(obj.complexity);
  const durationSeconds = obj.durationSeconds;
  const mainSubject = obj.mainSubject;
  const duration =
    typeof durationSeconds === "number"
      ? Math.round(durationSeconds)
      : typeof durationSeconds === "string"
        ? parseInt(durationSeconds, 10)
        : NaN;
  const safeDuration = Number.isNaN(duration)
    ? INTENT_DURATION_MAX
    : Math.min(INTENT_DURATION_MAX, Math.max(INTENT_DURATION_MIN, duration));

  let parsedMainSubject: string | null = null;
  if (typeof mainSubject === "string" && mainSubject.trim() !== "") {
    parsedMainSubject = mainSubject.trim().slice(0, 50);
  }

  return {
    audience,
    goal,
    tone,
    complexity,
    durationSeconds: safeDuration,
    rawInput,
    mainSubject: parsedMainSubject,
  };
}

export type InterpretIntentOptions = { model?: string; platform?: Platform };

async function requestIntentFromModel(
  input: string,
  apiKey: string,
  model: string,
  systemContent: string
): Promise<Intent> {
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

export async function interpretIntent(
  input: string,
  options?: InterpretIntentOptions
): Promise<Intent> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const primaryModel = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const platformSnippet =
    options?.platform && options.platform !== "general"
      ? getPlatformPromptSnippet(options.platform, "intent")
      : "";
  const systemContent = SYSTEM_PROMPT + platformSnippet;
  const modelCandidates = getModelCandidates(primaryModel);

  let lastError: unknown;
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i]!;
    try {
      return await requestIntentFromModel(input, apiKey, model, systemContent);
    } catch (err) {
      lastError = err;
      const shouldFallback = shouldRetryForLLM(err);
      const hasNext = i < modelCandidates.length - 1;
      if (!shouldFallback || !hasNext) {
        throw err;
      }
      console.warn(
        `[intent] Primary model failed (${model}). Falling back to ${modelCandidates[i + 1]}. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Intent interpretation failed");
}
