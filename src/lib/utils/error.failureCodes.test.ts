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

  it("only classifies the first line", () => {
    expect(
      mapFailedReasonToFailureCode("Remotion render failed (exit 1).\nunauthorized 401")
    ).not.toBe("AUTH");
    expect(mapFailedReasonToFailureCode("ElevenLabs TTS failed: 401.\nstack line")).toBe("AUTH");
  });

  it("does not read an HTTP status out of ffmpeg progress output", () => {

    const remotionOom =
      "Remotion render failed (exit 1). -------------\n" +
      "Version mismatch:\n" +
      "  - zod: installed 4.3.6, required 3.22.3\n" +
      "Error: FFmpeg quit with code null (SIGKILL)\n" +
      "frame= 153 q=21.0 size= 11264KiB bitrate=18332.8kbits/s speed=0.0403x\r" +
      "frame= 154 q=21.0 size= 11268KiB bitrate=18331.1kbits/s speed=0.0401x\r";

    expect(mapFailedReasonToFailureCode(remotionOom)).not.toBe("AUTH");
    expect(mapFailedReasonToFailureCode(remotionOom)).not.toBe("QUOTA");
  });

  it("is not fooled by a carriage-return-only progress stream", () => {
    const crOnly =
      "Remotion render failed (exit 1).\r" +
      "frame= 12 speed=0.0403x\rframe= 13 speed=0.0429x\r";
    expect(mapFailedReasonToFailureCode(crOnly)).not.toBe("AUTH");
    expect(mapFailedReasonToFailureCode(crOnly)).not.toBe("QUOTA");
  });

  it("still classifies a genuine single-line provider error", () => {
    expect(mapFailedReasonToFailureCode("ElevenLabs TTS failed: 401. Check your API key.")).toBe("AUTH");
    expect(mapFailedReasonToFailureCode("Veo: 429 RESOURCE_EXHAUSTED quota exceeded")).toBe("QUOTA");
    expect(
      mapFailedReasonToFailureCode("Remotion render timed out after 10 minutes. Try a shorter video.")
    ).toBe("TIMEOUT");
  });
});
