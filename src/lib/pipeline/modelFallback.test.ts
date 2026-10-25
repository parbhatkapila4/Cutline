import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnalysisAsset } from "@/lib/assets/analysis";

const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";
const INPUT = "Explain cold brew in 30 seconds";
const INTENT_JSON = JSON.stringify({
  audience: "broad",
  goal: "explain",
  tone: "playful",
  complexity: "simple",
  durationSeconds: 30,
  rawInput: INPUT,
  mainSubject: null,
});

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "OPENROUTER_FALLBACK_MODELS",
] as const;
let savedEnv: Record<string, string | undefined> = {};

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function anthropicOk(text: string, usage = { input_tokens: 1200, output_tokens: 90 }): Response {
  return new Response(
    JSON.stringify({ type: "message", content: [{ type: "text", text }], stop_reason: "end_turn", usage }),
    { status: 200 }
  );
}

function openRouterOk(text: string, cost = 0.0015): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 1100, completion_tokens: 80, cost },
    }),
    { status: 200 }
  );
}

function anthropicError(status: number, type: string, message: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ type: "error", error: { type, message } }), { status, headers });
}

function stubFetch(
  anthropic: () => Response,
  openRouter: () => Response = () => openRouterOk(INTENT_JSON)
): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      });
      return url === ANTHROPIC ? anthropic() : openRouter();
    })
  );
  return calls;
}

function providers(calls: Call[]): string[] {
  return calls.map((c) => (c.url === ANTHROPIC ? "anthropic" : c.url === OPENROUTER ? "openrouter" : c.url));
}
async function load() {
  vi.resetModules();
  const [{ interpretIntent }, { interpretEdit }, { withLlmCostTracking }, { createCostTracker }] = await Promise.all([
    import("./intent"),
    import("@/lib/edit/interpreter"),
    import("@/lib/llm/usage"),
    import("@/lib/cost/costEstimator"),
  ]);
  return { interpretIntent, interpretEdit, withLlmCostTracking, createCostTracker };
}

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("LLM stages go to Anthropic first", () => {
  it("asks Claude Haiku 5.5 with thinking off and no sampling settings", async () => {
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicOk(INTENT_JSON));

    const intent = await interpretIntent(INPUT);

    expect(intent).toEqual(expect.objectContaining({ audience: "broad", tone: "playful", durationSeconds: 30 }));
    expect(providers(calls)).toEqual(["anthropic"]);
    expect(calls[0]!.headers).toEqual(
      expect.objectContaining({ "x-api-key": "test-anthropic-key", "anthropic-version": "2026-10-21" })
    );
    expect(calls[0]!.body).toEqual({
      model: "claude-haiku-5-5",
      max_tokens: 4096,
      system: expect.stringContaining("You are an intent interpreter"),
      messages: [{ role: "user", content: `<user_topic>\n${INPUT}\n</user_topic>` }],
      thinking: { type: "disabled" },
    });
  });

  it("uses between_tools, the lowest thinking setting, when the model is Sonnet 5.5", async () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5-5";
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicOk(INTENT_JSON));

    await interpretIntent(INPUT);

    expect(calls[0]!.body).toEqual(
      expect.objectContaining({ model: "claude-sonnet-5-5", thinking: { type: "between_tools" } })
    );
  });

  it("sends an uploaded image to Anthropic as a base64 image block", async () => {
    vi.resetModules();
    vi.doMock("@/lib/assets/storage", () => ({
      fetchAssetBytes: vi.fn(),
      getAssetMetadata: vi.fn(),
      getLocalAssetPath: vi.fn(),
    }));
    const { analyzeResolvedAssets } = await import("@/lib/assets/analysis");
    const calls = stubFetch(() =>
      anthropicOk(
        JSON.stringify({ dominantColors: ["#000000", "#ffffff"], aspectRatio: 1, hasTransparency: true, suggestedPlacement: "outro" })
      )
    );
    const bytes = Buffer.from("png-bytes");
    const logo = { meta: { id: "logo-1", type: "logo", mimeType: "image/png" }, bytes } as unknown as AnalysisAsset;

    const analyzed = await analyzeResolvedAssets([logo]);

    expect(analyzed.logo).toEqual(expect.objectContaining({ suggestedPlacement: "outro", hasTransparency: true }));
    expect(calls[0]!.body.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: expect.stringContaining("Analyze this logo image") },
          { type: "image", source: { type: "base64", media_type: "image/png", data: bytes.toString("base64") } },
        ],
      },
    ]);
    vi.doUnmock("@/lib/assets/storage");
  });
});

describe("a job falls through to OpenRouter when Anthropic fails", () => {
  it.each<[string, () => Response]>([
    ["401, a bad or revoked key", () => anthropicError(401, "authentication_error", "invalid x-api-key")],
    [
      "429, a rate limit",
      () => anthropicError(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit", { "retry-after": "30" }),
    ],
    [
      "400, credit used up",
      () =>
        anthropicError(
          400,
          "invalid_request_error",
          "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."
        ),
    ],
    [
      "400, a spend limit reached",
      () =>
        anthropicError(
          400,
          "invalid_request_error",
          "You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC."
        ),
    ],
    ["402, a billing problem", () => anthropicError(402, "billing_error", "There's an issue with your billing or payment information.")],
    ["529, overloaded", () => anthropicError(529, "overloaded_error", "Overloaded")],
    ["500, a server error", () => anthropicError(500, "api_error", "Internal server error")],
    [
      "a network error",
      () => {
        throw new TypeError("fetch failed");
      },
    ],
    [
      "a timeout",
      () => {
        throw Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
      },
    ],
  ])("at the intent stage, on %s", async (_name, failure) => {
    const { interpretIntent } = await load();
    const calls = stubFetch(failure);

    const intent = await interpretIntent(INPUT);

    expect(intent).toEqual(expect.objectContaining({ audience: "broad", durationSeconds: 30 }));
    expect(providers(calls)).toEqual(["anthropic", "openrouter"]);
    expect(calls[1]!.body).toEqual({
      model: "anthropic/claude-haiku-4.5",
      messages: [
        { role: "system", content: expect.stringContaining("You are an intent interpreter") },
        { role: "user", content: `<user_topic>\n${INPUT}\n</user_topic>` },
      ],
      temperature: 0,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });
  });

  it("in Edit with AI, which used to have no fallback at all", async () => {
    const { interpretEdit } = await load();
    const calls = stubFetch(
      () => anthropicError(401, "authentication_error", "invalid x-api-key"),
      () => openRouterOk("A punchier launch video for Halden Cold Brew.")
    );

    await expect(interpretEdit("Launch video for Halden Cold Brew.", "Make it punchier")).resolves.toBe(
      "A punchier launch video for Halden Cold Brew."
    );
    expect(providers(calls)).toEqual(["anthropic", "openrouter"]);
  });

  it("fails with OpenRouter's error when both providers fail", async () => {
    const { interpretIntent } = await load();
    stubFetch(
      () => anthropicError(401, "authentication_error", "invalid x-api-key"),
      () => new Response("{\"error\":{\"message\":\"User not found.\",\"code\":401}}", { status: 401 })
    );

    await expect(interpretIntent(INPUT)).rejects.toThrow(
      "Intent interpretation failed: API returned 401. Check your API key."
    );
  });
});

describe("Anthropic is skipped while a failure will keep happening", () => {
  it.each<[string, () => Response]>([
    ["a bad key", () => anthropicError(401, "authentication_error", "invalid x-api-key")],
    [
      "used-up credit",
      () =>
        anthropicError(
          400,
          "invalid_request_error",
          "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."
        ),
    ],
  ])("for ten minutes after %s, then it is tried again", async (_name, failure) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { interpretIntent } = await load();
    const calls = stubFetch(failure);

    await interpretIntent(INPUT);
    await interpretIntent(INPUT);
    expect(providers(calls)).toEqual(["anthropic", "openrouter", "openrouter"]);

    vi.setSystemTime(Date.now() + 10 * 60_000 + 1_000);
    await interpretIntent(INPUT);
    expect(providers(calls)).toEqual(["anthropic", "openrouter", "openrouter", "anthropic", "openrouter"]);
  });

  it("for a rate limit's retry-after time only", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicError(429, "rate_limit_error", "Rate limited", { "retry-after": "30" }));

    await interpretIntent(INPUT);
    await interpretIntent(INPUT);
    vi.setSystemTime(Date.now() + 31_000);
    await interpretIntent(INPUT);

    expect(providers(calls)).toEqual(["anthropic", "openrouter", "openrouter", "anthropic", "openrouter"]);
  });

  it("but not after an overload, which is tried again on the next call", async () => {
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicError(529, "overloaded_error", "Overloaded"));

    await interpretIntent(INPUT);
    await interpretIntent(INPUT);

    expect(providers(calls)).toEqual(["anthropic", "openrouter", "anthropic", "openrouter"]);
  });
});

describe("which keys are set", () => {
  it("uses only OpenRouter when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicOk(INTENT_JSON));

    await expect(interpretIntent(INPUT)).resolves.toEqual(expect.objectContaining({ audience: "broad" }));
    expect(providers(calls)).toEqual(["openrouter"]);
  });

  it("uses Anthropic alone when OPENROUTER_API_KEY is missing, even right after a failure", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicError(401, "authentication_error", "invalid x-api-key"));

    await expect(interpretIntent(INPUT)).rejects.toThrow(
      "Intent interpretation failed: Anthropic returned 401. Check ANTHROPIC_API_KEY."
    );
    await expect(interpretIntent(INPUT)).rejects.toThrow("Anthropic returned 401");
    expect(providers(calls)).toEqual(["anthropic", "anthropic"]);
  });

  it("names both keys when neither is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicOk(INTENT_JSON));

    await expect(interpretIntent(INPUT)).rejects.toThrow(
      "No LLM API key is set. Add ANTHROPIC_API_KEY or OPENROUTER_API_KEY to .env.local"
    );
    expect(calls).toEqual([]);
  });
});

describe("a job that picked its own model keeps it", () => {
  it("sends another vendor's model straight to OpenRouter", async () => {
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicOk(INTENT_JSON));

    await interpretIntent(INPUT, { model: "google/gemini-2.5-flash" });

    expect(providers(calls)).toEqual(["openrouter"]);
    expect(calls[0]!.body.model).toBe("google/gemini-2.5-flash");
  });

  it("sends a Claude model to Anthropic under its Anthropic ID, then to OpenRouter under its own", async () => {
    const { interpretIntent } = await load();
    const calls = stubFetch(() => anthropicError(529, "overloaded_error", "Overloaded"));

    await interpretIntent(INPUT, { model: "anthropic/claude-sonnet-4.5" });

    expect(providers(calls)).toEqual(["anthropic", "openrouter"]);
    expect(calls[0]!.body.model).toBe("claude-sonnet-4-5");
    expect(calls[1]!.body.model).toBe("anthropic/claude-sonnet-4.5");
  });
});

describe("what an LLM call costs the job", () => {
  it("books an Anthropic call at Haiku 5.5's price, from the tokens Anthropic reports", async () => {
    const { interpretIntent, withLlmCostTracking, createCostTracker } = await load();
    stubFetch(() => anthropicOk(INTENT_JSON, { input_tokens: 50_000, output_tokens: 10_000 }));
    const tracker = createCostTracker();

    await withLlmCostTracking(tracker, () => interpretIntent(INPUT));

    // 50,000 x $0.10 + 10,000 x $0.50 per million tokens.
    expect(tracker.getBreakdown()).toEqual(expect.objectContaining({ llm: 0.01, total: 0.01 }));
  });

  it("books what OpenRouter charged when the call fell through, and nothing for the failed Anthropic try", async () => {
    const { interpretIntent, withLlmCostTracking, createCostTracker } = await load();
    stubFetch(
      () => anthropicError(401, "authentication_error", "invalid x-api-key"),
      () => openRouterOk(INTENT_JSON, 0.0042)
    );
    const tracker = createCostTracker();

    await withLlmCostTracking(tracker, () => interpretIntent(INPUT));

    expect(tracker.getBreakdown().llm).toBe(0.0042);
  });
});
