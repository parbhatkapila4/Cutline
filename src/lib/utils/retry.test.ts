import { describe, it, expect } from "vitest";
import {
  parseHttpStatus,
  shouldRetryForLLM,
  shouldRetryForTTS,
  shouldRetryForImage,
  shouldRetryForRender,
} from "./retry";
import {
  RenderKilledError,
  RenderOutOfMemoryError,
  RenderTimeoutError,
} from "@/lib/pipeline/renderVideo";

describe("parseHttpStatus", () => {
  it("returns 429 for message 'API returned 429'", () => {
    expect(parseHttpStatus(new Error("API returned 429"))).toBe(429);
  });

  it("returns 500 for 'failed: 500'", () => {
    expect(parseHttpStatus(new Error("failed: 500"))).toBe(500);
  });

  it("returns 404 for '404 not found'", () => {
    expect(parseHttpStatus(new Error("404 not found"))).toBe(404);
  });

  it("returns null when no status in message", () => {
    expect(parseHttpStatus(new Error("something else"))).toBe(null);
  });
});

describe("shouldRetryForLLM", () => {
  it("returns true for 429, 408, 504, 5xx", () => {
    expect(shouldRetryForLLM(new Error("API returned 429"))).toBe(true);
    expect(shouldRetryForLLM(new Error("status 408"))).toBe(true);
    expect(shouldRetryForLLM(new Error("504 gateway"))).toBe(true);
    expect(shouldRetryForLLM(new Error("500 server error"))).toBe(true);
    expect(shouldRetryForLLM(new Error("503 unavailable"))).toBe(true);
  });

  it("returns false for 400, 401, 403", () => {
    expect(shouldRetryForLLM(new Error("400 bad request"))).toBe(false);
    expect(shouldRetryForLLM(new Error("401 unauthorized"))).toBe(false);
    expect(shouldRetryForLLM(new Error("403 forbidden"))).toBe(false);
  });

  it("returns true for OpenRouter models with no active endpoints", () => {
    expect(
      shouldRetryForLLM(
        new Error(
          'API returned 404. {"error":{"message":"No endpoints found for google/gemini-2.0-flash-lite-001.","code":404}}'
        )
      )
    ).toBe(true);
  });

  it("returns true for message containing 'timeout' with no status", () => {
    expect(shouldRetryForLLM(new Error("request timeout"))).toBe(true);
  });

  it("returns true for message containing 'econnreset' with no status", () => {
    expect(shouldRetryForLLM(new Error("econnreset"))).toBe(true);
  });
});

describe("shouldRetryForTTS", () => {
  it("returns true for 429 and 5xx", () => {
    expect(shouldRetryForTTS(new Error("429"))).toBe(true);
    expect(shouldRetryForTTS(new Error("500 error"))).toBe(true);
  });

  it("returns false for 400, 401, 403", () => {
    expect(shouldRetryForTTS(new Error("400"))).toBe(false);
    expect(shouldRetryForTTS(new Error("401"))).toBe(false);
    expect(shouldRetryForTTS(new Error("403"))).toBe(false);
  });
});

describe("shouldRetryForImage", () => {
  it("returns true for 429 and 5xx", () => {
    expect(shouldRetryForImage(new Error("429"))).toBe(true);
    expect(shouldRetryForImage(new Error("500"))).toBe(true);
  });

  it("returns false for 404, 400, 401", () => {
    expect(shouldRetryForImage(new Error("404 not found"))).toBe(false);
    expect(shouldRetryForImage(new Error("400"))).toBe(false);
    expect(shouldRetryForImage(new Error("401"))).toBe(false);
  });
});

describe("shouldRetryForRender", () => {
  it("returns true for 'timed out' or 'timeout'", () => {
    expect(shouldRetryForRender(new Error("render timed out"))).toBe(true);
    expect(shouldRetryForRender(new Error("timeout"))).toBe(true);
  });

  it("returns false for 'missing props'", () => {
    expect(shouldRetryForRender(new Error("missing props"))).toBe(false);
  });

  it("returns false for 'invalid composition'", () => {
    expect(shouldRetryForRender(new Error("invalid composition"))).toBe(false);
  });
});

describe("shouldRetryForRender: budget failures are not retried", () => {
  it("does not retry our own render timeout", () => {
    expect(
      shouldRetryForRender(
        new RenderTimeoutError("Remotion render timed out after 601s (budget 600s).")
      )
    ).toBe(false);
  });

  it("does not retry an out-of-memory kill, typed or bare", () => {
    expect(
      shouldRetryForRender(
        new RenderOutOfMemoryError("Remotion render ran out of memory after 143s (exit 1).")
      )
    ).toBe(false);
    expect(
      shouldRetryForRender(
        new Error("Remotion render failed (exit null).\nFFmpeg quit with code null (SIGKILL)")
      )
    ).toBe(false);
  });

  it("still retries an external kill, which is not caused by the inputs", () => {
    expect(
      shouldRetryForRender(
        new RenderKilledError(
          "Remotion render was terminated by SIGTERM after 118s, far short of its 600s budget."
        )
      )
    ).toBe(true);
  });

  it("still retries a timeout raised by anything other than our render budget", () => {
    expect(shouldRetryForRender(new Error("delayRender() timed out after 30000ms"))).toBe(true);
  });
});
