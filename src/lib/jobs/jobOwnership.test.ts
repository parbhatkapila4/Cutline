import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockGetClientId } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetClientId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock("@/lib/rate-limit", () => ({ getClientIdentifier: mockGetClientId }));

import {
  resolveOwnerCandidates,
  resolveOwnerIdentifier,
  requestOwnsResource,
} from "@/lib/jobs/jobOwnership";

const req = () => new Request("http://localhost/x", { headers: { "x-real-ip": "VICTIM" } });

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetClientId.mockReset();
  mockGetClientId.mockReturnValue("VICTIM");
});

describe("resolveOwnerCandidates", () => {
  it("returns the session user and never the client identifier", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "attacker" } });
    expect(await resolveOwnerCandidates(req())).toEqual(["attacker"]);
  });

  it("returns nothing for an anonymous caller — the IP is not an owner", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await resolveOwnerCandidates(req())).toEqual([]);
  });
});

describe("requestOwnsResource - a forged client identifier cannot take over a job", () => {
  it("denies a signed-in attacker whose forged x-real-ip matches the owner", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "attacker" } });
    expect(await requestOwnsResource(req(), "VICTIM")).toBe(false);
  });

  it("denies an anonymous caller whose forged x-real-ip matches the owner", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await requestOwnsResource(req(), "VICTIM")).toBe(false);
  });

  it("allows the genuine session owner", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "VICTIM" } });
    expect(await requestOwnsResource(req(), "VICTIM")).toBe(true);
  });
});

describe("resolveOwnerIdentifier - attribution still uses the client id", () => {
  it("uses the session user when present", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "attacker" } });
    expect(await resolveOwnerIdentifier(req())).toBe("attacker");
  });

  it("falls back to the client identifier for an anonymous caller", async () => {
    mockGetSession.mockResolvedValue(null);
    expect(await resolveOwnerIdentifier(req())).toBe("VICTIM");
  });
});
