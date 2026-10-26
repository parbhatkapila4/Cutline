import { describe, it, expect } from "vitest";
import { PLAN_CONFIGS, SHARE_LINKS_PLAN_NOTE, canShareLinks, type PlanId } from "./plans";

const PLAN_IDS = Object.keys(PLAN_CONFIGS) as PlanId[];

describe("canShareLinks", () => {
  it("is on for Professional and Enterprise and off for Free and Beginner", () => {
    expect(Object.fromEntries(PLAN_IDS.map((id) => [id, canShareLinks(id)]))).toEqual({
      free: false,
      beginner: false,
      professional: true,
      enterprise: true,
    });
  });

  it("is off while the plan is not known or not recognised", () => {
    expect(canShareLinks(null)).toBe(false);
    expect(canShareLinks(undefined)).toBe(false);
    expect(canShareLinks("platinum")).toBe(false);
  });

  it("is described by a note that names exactly the plans that can share", () => {
    for (const id of PLAN_IDS) {
      expect(SHARE_LINKS_PLAN_NOTE.includes(PLAN_CONFIGS[id].label)).toBe(canShareLinks(id));
    }
  });
});
