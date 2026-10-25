import { recordLlmCall } from "@/lib/llm/usage";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2026-10-21";

export type LlmProvider = "anthropic" | "openrouter";

export type ModelCandidate = { provider: LlmProvider; model: string };

export type ChatImage = { mimeType: string; base64: string };

export type ChatRequest = {
  system?: string;
  user: string;
  images?: ChatImage[];
  temperature: number;
  maxTokens: number;
  json?: boolean;
  timeoutMs: number;
};

export class LlmHttpError extends Error {
  readonly provider: LlmProvider;
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, provider: LlmProvider, status: number, retryAfterSeconds: number | null) {
    super(message);
    this.name = "LlmHttpError";
    this.provider = provider;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type Usage = {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  reportedCostUsd?: number;
};

type Reply = { text: string; refused: boolean; usage?: Usage };

type AnthropicBody = {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number | null;
    cache_read_input_tokens?: number | null;
  };
};

type OpenRouterBody = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
};
function thinkingFor(model: string): { type: "disabled" | "between_tools" } | undefined {
  if (model.startsWith("claude-sonnet-5-5")) return { type: "between_tools" };
  if (/^claude-(opus-5-5|fable|mythos)/.test(model)) return undefined;
  return { type: "disabled" };
}

function anthropicInit(model: string, request: ChatRequest, apiKey: string): RequestInit {
  const content = request.images?.length
    ? [
      { type: "text", text: request.user },
      ...request.images.map((image) => ({
        type: "image",
        source: { type: "base64", media_type: image.mimeType, data: image.base64 },
      })),
    ]
    : request.user;
  const thinking = thinkingFor(model);
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens,
      ...(request.system ? { system: request.system } : {}),
      messages: [{ role: "user", content }],
      ...(thinking ? { thinking } : {}),
    }),
  };
}

function openRouterInit(model: string, request: ChatRequest, apiKey: string): RequestInit {
  const content = request.images?.length
    ? [
      { type: "text", text: request.user },
      ...request.images.map((image) => ({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
      })),
    ]
    : request.user;
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(request.system ? [{ role: "system", content: request.system }] : []),
        { role: "user", content },
      ],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
    }),
  };
}

function readAnthropic(body: AnthropicBody): Reply {
  const text = (body.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
  const usage = body.usage;
  return {
    text,
    refused: body.stop_reason === "refusal",
    usage: usage
      ? {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      }
      : undefined,
  };
}

function readOpenRouter(body: OpenRouterBody): Reply {
  const content = body.choices?.[0]?.message?.content;
  const usage = body.usage;
  return {
    text: typeof content === "string" ? content : "",
    refused: false,
    usage: usage
      ? {
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        ...(typeof usage.cost === "number" && Number.isFinite(usage.cost) ? { reportedCostUsd: usage.cost } : {}),
      }
      : undefined,
  };
}
function estimatedUsage(request: ChatRequest, text: string): Usage {
  const promptChars = (request.system ?? "").length + request.user.length;
  return { inputTokens: Math.ceil(promptChars / 3), outputTokens: Math.ceil(text.length / 3) };
}
export async function requestChat(candidate: ModelCandidate, request: ChatRequest, label: string): Promise<string> {
  const anthropic = candidate.provider === "anthropic";
  const keyName = anthropic ? "ANTHROPIC_API_KEY" : "OPENROUTER_API_KEY";
  const apiKey = process.env[keyName]?.trim();
  if (!apiKey) {
    throw new Error(`${label} failed: ${keyName} is not set`);
  }
  const init = anthropic
    ? anthropicInit(candidate.model, request, apiKey)
    : openRouterInit(candidate.model, request, apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs);
  let response: Response;
  try {
    response = await fetch(anthropic ? ANTHROPIC_URL : OPENROUTER_URL, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error(`${label} timed out. Try again.`);
      }
      throw new Error(`${label} failed: ${err.message}`);
    }
    throw new Error(`${label} failed: unknown error`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const retryAfter = Number(response.headers.get("retry-after"));
    const hint = response.status === 401 ? `Check ${anthropic ? "ANTHROPIC_API_KEY" : "your API key"}.` : text;
    throw new LlmHttpError(
      `${label} failed: ${anthropic ? "Anthropic" : "API"} returned ${response.status}. ${hint}`,
      candidate.provider,
      response.status,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${label} failed: invalid response from API`);
  }
  const body = data !== null && typeof data === "object" ? data : {};
  const reply = anthropic ? readAnthropic(body as AnthropicBody) : readOpenRouter(body as OpenRouterBody);
  recordLlmCall({
    provider: candidate.provider,
    model: candidate.model,
    ...(reply.usage ?? estimatedUsage(request, reply.text)),
  });

  if (reply.refused) {
    throw new Error(`${label} failed: the model declined the request`);
  }
  if (reply.text.trim() === "") {
    throw new Error(`${label} failed: empty response from model`);
  }
  return reply.text;
}
