import { describe, expect, it } from "vitest";
import { mapFailedReasonToFailureCode } from "./error";

describe("mapFailedReasonToFailureCode", () => {
  it("classifies quota and timeout", () => {
    expect(mapFailedReasonToFailureCode("429 too many requests")).toBe("QUOTA");
    expect(mapFailedReasonToFailureCode("Request timed out")).toBe("TIMEOUT");
  });

  it("classifies cancelled and quality gate", () => {
    expect(mapFailedReasonToFailureCode("Job cancelled by user")).toBe("CANCELLED");
    expect(mapFailedReasonToFailureCode("quality gate failed")).toBe("QUALITY_GATE");
  });

  it("returns UNKNOWN for empty or opaque errors", () => {
    expect(mapFailedReasonToFailureCode(null)).toBe("UNKNOWN");
    expect(mapFailedReasonToFailureCode("")).toBe("UNKNOWN");
  });
});
