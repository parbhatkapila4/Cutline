import { describe, it, expect } from "vitest";
import { extractJsonFromModelOutput } from "./modelJson";

const OBJ = '{"audience":"broad","goal":"explain"}';

describe("extractJsonFromModelOutput", () => {
  it("returns bare JSON unchanged", () => {
    expect(extractJsonFromModelOutput(OBJ)).toBe(OBJ);
    expect(extractJsonFromModelOutput('  [1,2,3] ')).toBe("[1,2,3]");
  });

  it("strips a json code fence", () => {
    expect(extractJsonFromModelOutput("```json\n" + OBJ + "\n```")).toBe(OBJ);
    expect(extractJsonFromModelOutput("```\n" + OBJ + "\n```")).toBe(OBJ);
  });

  it("handles fence language tags with digits", () => {
    expect(extractJsonFromModelOutput("```json5\n" + OBJ + "\n```")).toBe(OBJ);
  });

  it("rescues JSON starting at index 0 with trailing prose", () => {
    const raw = OBJ + "\n\nHope this helps!";
    expect(extractJsonFromModelOutput(raw)).toBe(OBJ);
  });

  it("rescues JSON with trailing prose containing brackets", () => {
    const raw = "Here is the JSON:\n" + OBJ + "\nNote: see [1] for details.";
    expect(extractJsonFromModelOutput(raw)).toBe(OBJ);
  });

  it("skips non-JSON braces in leading prose", () => {
    const raw = "I mapped {shot} to text.\n" + OBJ;
    expect(extractJsonFromModelOutput(raw)).toBe(OBJ);
  });

  it("picks the first parseable block among multiple fences", () => {
    const raw = "```json\n" + OBJ + "\n```\nAnd corrected:\n```json\n{\"b\":2}\n```";
    expect(extractJsonFromModelOutput(raw)).toBe(OBJ);
  });

  it("handles braces and fences inside JSON string values", () => {
    const tricky = '{"text":"use ```code``` and {curly} and \\"quotes\\""}';
    const raw = "```json\n" + tricky + "\n```";
    const out = extractJsonFromModelOutput(raw);
    expect(() => JSON.parse(out)).not.toThrow();
    expect(JSON.parse(out).text).toContain("{curly}");
  });

  it("rescues JSON after an unterminated fence", () => {
    const raw = "```json\n" + OBJ;
    expect(extractJsonFromModelOutput(raw)).toBe(OBJ);
  });

  it("returns input for unparseable garbage so callers throw their own error", () => {
    expect(extractJsonFromModelOutput("no json here")).toBe("no json here");
  });
});
