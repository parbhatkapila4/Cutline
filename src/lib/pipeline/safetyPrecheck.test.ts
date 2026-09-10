import { describe, it, expect } from "vitest";
import { parseFlagged, isSafetyPrecheckEnabled } from "./safetyPrecheck";

describe("parseFlagged", () => {
  it("reads a clean JSON object", () => {
    expect(parseFlagged('{"flagged":[0,3]}', 8)).toEqual([0, 3]);
  });

  it("reads JSON wrapped in code fences", () => {
    const content = '```json\n{"flagged":[1,2]}\n```';
    expect(parseFlagged(content, 8)).toEqual([1, 2]);
  });

  it("reads JSON with prose around it", () => {
    const content =
      'Sure! Looking at these lines, two of them mention a named public figure.\n\n{"flagged":[4,5]}\n\nHope that helps.';
    expect(parseFlagged(content, 8)).toEqual([4, 5]);
  });

  it("returns an all-clear for an empty flagged array", () => {
    expect(parseFlagged('{"flagged":[]}', 8)).toEqual([]);
  });

  it("drops out-of-range and negative indices", () => {
    expect(parseFlagged('{"flagged":[2,8,99,-1]}', 5)).toEqual([2]);
  });

  it("de-duplicates repeated indices", () => {
    expect(parseFlagged('{"flagged":[1,1,1,3]}', 5)).toEqual([1, 3]);
  });

  it("coerces numeric strings, which models emit often", () => {
    expect(parseFlagged('{"flagged":["0","2"]}', 5)).toEqual([0, 2]);
  });

  it("rejects non-integer values rather than rounding them", () => {
    expect(parseFlagged('{"flagged":[1.5,"two",null,true,{}]}', 5)).toEqual([]);
  });

  describe("malformed input yields an all-clear, never a throw", () => {
    const garbage: [string, string][] = [
      ["empty string", ""],
      ["whitespace", "   \n  "],
      ["plain prose, no JSON", "None of these lines look risky to me."],
      ["a refusal", "I'm sorry, I can't help with that."],
      ["truncated JSON", '{"flagged":[0,'],
      ["unbalanced braces", '{"flagged": [0] '],
      ["JSON array, not an object", "[0,1,2]"],
      ["object without the key", '{"result":[0,1]}'],
      ["flagged is not an array", '{"flagged":"0,1"}'],
      ["flagged is null", '{"flagged":null}'],
      ["JSON null", "null"],
      ["a bare number", "42"],
      ["HTML error page", "<html><body>502 Bad Gateway</body></html>"],
    ];

    for (const [label, input] of garbage) {
      it(label, () => {
        expect(() => parseFlagged(input, 8)).not.toThrow();
        expect(parseFlagged(input, 8)).toEqual([]);
      });
    }
  });

  it("handles a zero-chunk job without flagging anything", () => {
    expect(parseFlagged('{"flagged":[0]}', 0)).toEqual([]);
  });
});

describe("isSafetyPrecheckEnabled", () => {
  const reset = (v?: string) => {
    if (v === undefined) delete process.env.VEO_SAFETY_PRECHECK;
    else process.env.VEO_SAFETY_PRECHECK = v;
  };

  it("is on by default", () => {
    reset(undefined);
    expect(isSafetyPrecheckEnabled()).toBe(true);
  });

  it('is off for "false" and "0", case-insensitively', () => {
    for (const v of ["false", "FALSE", "0", " false "]) {
      reset(v);
      expect(isSafetyPrecheckEnabled()).toBe(false);
    }
    reset(undefined);
  });

  it("stays on for any other value", () => {
    for (const v of ["true", "1", "yes", ""]) {
      reset(v);
      expect(isSafetyPrecheckEnabled()).toBe(true);
    }
    reset(undefined);
  });
});
