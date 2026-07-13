import type { Intent, NarrativePlan } from "@/lib/types";
import type { Platform } from "@/lib/platform/types";
import { getPlatformPromptSnippet } from "@/lib/platform/platformStrategy";
import { shouldRetryForLLM } from "@/lib/utils/retry";
import { getModelCandidates } from "@/lib/pipeline/modelFallback";
import { extractJsonFromModelOutput } from "@/lib/utils/modelJson";
import type {
  EmotionalIntent,
  MotionType,
  Shot,
  ShotList,
  ShotPurpose,
  TextDensity,
} from "@/lib/types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-haiku-4.5";

const SHOT_PURPOSES: ShotPurpose[] = [
  "establish",
  "reveal",
  "emphasize",
  "transition",
  "hold",
];
const MOTION_TYPES: MotionType[] = [
  "static",
  "push",
  "pull",
  "pan-left",
  "pan-right",
  "zoom-in",
  "zoom-out",
  "cut",
];
const EMOTIONAL_INTENTS: EmotionalIntent[] = [
  "tension",
  "release",
  "curiosity",
  "urgency",
  "calm",
  "neutral",
];

const SYSTEM_PROMPT = `You are a shot-level reasoner for a short video. Given an Intent and a NarrativePlan (with beats), output a single JSON object with exactly these keys (no other keys, no markdown, no explanation):

- shots: array of 4-12 shot objects. Map 1-3 shots per narrative beat (use fewer for short videos). Each shot has:
  - id: string (e.g. "shot-1", "shot-2")
  - beatId: string (must be one of the beat ids from the NarrativePlan)
  - durationSeconds: number (positive integer)
  - purpose: one of "establish" | "reveal" | "emphasize" | "transition" | "hold"
  - motionType: one of "static" | "push" | "pull" | "pan-left" | "pan-right" | "zoom-in" | "zoom-out" | "cut"
  - emotionalIntent: one of "tension" | "release" | "curiosity" | "urgency" | "calm" | "neutral"
  - textDensity: number 0, 1, 2, or 3 (0 = silence, 1 = low, 2 = medium, 3 = high). Use 0 for transition/hold; 1-3 for beats that carry meaning. Match to beat pacing.
  - order: number (sequence order, 1-based)
  Purpose, motion, and emotional intent must align with each beat's purpose and pacing. The sum of all shot durationSeconds MUST equal NarrativePlan.totalDurationSeconds.
- totalDurationSeconds: number, must equal NarrativePlan.totalDurationSeconds

Output only valid JSON.`;

function isShotPurpose(s: string): s is ShotPurpose {
  return (SHOT_PURPOSES as readonly string[]).includes(s);
}
function isMotionType(s: string): s is MotionType {
  return (MOTION_TYPES as readonly string[]).includes(s);
}
function isEmotionalIntent(s: string): s is EmotionalIntent {
  return (EMOTIONAL_INTENTS as readonly string[]).includes(s);
}
function isTextDensity(n: number): n is TextDensity {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

function parseAndValidateShotList(
  raw: string,
  plan: NarrativePlan,
  targetDuration: number
): ShotList {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonFromModelOutput(raw)) as Record<string, unknown>;
  } catch {
    throw new Error("Shot reasoning failed: invalid JSON from model");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Shot reasoning failed: expected a JSON object");
  }
  const obj = parsed as Record<string, unknown>;

  const shotsRaw = obj.shots;
  const minShots = 4;
  const maxShots = 12;
  if (!Array.isArray(shotsRaw) || shotsRaw.length < minShots || shotsRaw.length > maxShots) {
    throw new Error(`Shot reasoning failed: shots must be an array of ${minShots}-${maxShots} items (got ${Array.isArray(shotsRaw) ? shotsRaw.length : "non-array"})`);
  }

  const beatIds = new Set(plan.beats.map((b) => b.id));

  const shots: Shot[] = shotsRaw.map((item, i) => {
    const s = item as Record<string, unknown>;
    const id = s.id;
    const beatId = s.beatId;
    const durationSeconds = s.durationSeconds;
    const purpose = s.purpose;
    const motionType = s.motionType;
    const emotionalIntent = s.emotionalIntent;
    const textDensity = s.textDensity;
    const order = s.order;

    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`Shot reasoning failed: shot ${i} missing or invalid id`);
    }
    if (typeof beatId !== "string" || !beatIds.has(beatId)) {
      throw new Error(
        `Shot reasoning failed: shot ${i} beatId must be one of ${[...beatIds].join(", ")}`
      );
    }
    let dur =
      typeof durationSeconds === "number"
        ? Math.round(durationSeconds)
        : typeof durationSeconds === "string"
          ? parseInt(durationSeconds, 10)
          : NaN;
    if (Number.isNaN(dur) || dur < 1) {
      dur = 1;
    }
    const safePurpose: ShotPurpose =
      typeof purpose === "string" && isShotPurpose(purpose)
        ? purpose
        : i === 0
          ? "establish"
          : "hold";
    const safeMotionType: MotionType =
      typeof motionType === "string" && isMotionType(motionType) ? motionType : "static";
    const safeEmotionalIntent: EmotionalIntent =
      typeof emotionalIntent === "string" && isEmotionalIntent(emotionalIntent)
        ? emotionalIntent
        : "neutral";
    const td =
      typeof textDensity === "number"
        ? textDensity
        : typeof textDensity === "string"
          ? parseInt(textDensity, 10)
          : NaN;
    const safeTd: TextDensity = isTextDensity(td) ? td : 1;
    const ord =
      typeof order === "number"
        ? Math.round(order)
        : typeof order === "string"
          ? parseInt(order, 10)
          : NaN;
    const safeOrd = Number.isNaN(ord) || ord < 1 ? i + 1 : ord;

    return {
      id: id.trim(),
      beatId,
      durationSeconds: dur,
      purpose: safePurpose,
      motionType: safeMotionType,
      emotionalIntent: safeEmotionalIntent,
      textDensity: safeTd,
      order: safeOrd,
    };
  });

  const sum = shots.reduce((s, sh) => s + sh.durationSeconds, 0);
  if (sum <= 0) {
    throw new Error("Shot reasoning failed: shot durations must sum to a positive number");
  }

  const scale = targetDuration / sum;
  const normalized = shots.map((sh) => ({
    ...sh,
    durationSeconds: Math.max(1, Math.round(sh.durationSeconds * scale)),
  }));
  const normalizedSum = normalized.reduce((s, sh) => s + sh.durationSeconds, 0);
  const remainder = targetDuration - normalizedSum;
  if (remainder !== 0 && normalized.length > 0) {
    const last = normalized[normalized.length - 1]!;
    last.durationSeconds = Math.max(1, last.durationSeconds + remainder);
  }

  normalized.forEach((sh, idx) => {
    sh.order = idx + 1;
  });

  return {
    shots: normalized,
    totalDurationSeconds: targetDuration,
  };
}

export type PlanShotsOptions = { model?: string; platform?: Platform };

async function requestShotPlanFromModel(
  intent: Intent,
  plan: NarrativePlan,
  apiKey: string,
  model: string,
  systemContent: string
): Promise<ShotList> {
  const userContent = JSON.stringify({ intent, plan });
  const url = `${OPENROUTER_BASE}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "system" as const, content: systemContent },
      { role: "user" as const, content: userContent },
    ],
    temperature: 0,
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
        throw new Error("Shot reasoning timed out. Try again.");
      }
      throw new Error(`Shot reasoning failed: ${err.message}`);
    }
    throw new Error("Shot reasoning failed: unknown error");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Shot reasoning failed: API returned ${response.status}. ${response.status === 401 ? "Check your API key." : text || ""}`
    );
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Shot reasoning failed: invalid response from API");
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Shot reasoning failed: empty response from model");
  }

  return parseAndValidateShotList(content.trim(), plan, plan.totalDurationSeconds);
}

export async function planShots(
  intent: Intent,
  plan: NarrativePlan,
  options?: PlanShotsOptions
): Promise<ShotList> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const primaryModel = options?.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const platformSnippet =
    options?.platform && options.platform !== "general"
      ? getPlatformPromptSnippet(options.platform, "shots")
      : "";
  const systemContent = SYSTEM_PROMPT + platformSnippet;
  const modelCandidates = getModelCandidates(primaryModel);

  let lastError: unknown;
  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i]!;
    try {
      return await requestShotPlanFromModel(intent, plan, apiKey, model, systemContent);
    } catch (err) {
      lastError = err;
      const shouldFallback = shouldRetryForLLM(err);
      const hasNext = i < modelCandidates.length - 1;
      if (!shouldFallback || !hasNext) {
        throw err;
      }
      console.warn(
        `[shots] Primary model failed (${model}). Falling back to ${modelCandidates[i + 1]}. Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Shot reasoning failed");
}
