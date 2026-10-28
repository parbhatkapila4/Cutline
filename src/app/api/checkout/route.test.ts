import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const forwarded = vi.hoisted(() => ({ last: null as NextRequest | null }));

vi.mock("@dodopayments/nextjs", () => ({
  Checkout: () => async (req: NextRequest) => {
    forwarded.last = req;
    return new Response(null, { status: 200 });
  },
}));
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => ({ user: { id: "u1", email: "a@b.co" } })) } },
}));
vi.mock("@/lib/payments/dodo", () => ({ dodoEnvironment: () => "test_mode" }));
vi.mock("@/lib/products", () => ({
  isKnownProductId: (id: string | null) => id === "pdt_plan",
  isTopupProductId: () => false,
}));
vi.mock("@/lib/users/planService", () => ({ getUserPlan: vi.fn() }));

import { GET } from "./route";

function checkout(query: string, cookie?: string) {
  return GET(
    new NextRequest(`https://cutline.example/api/checkout?productId=pdt_plan${query}`, {
      headers: cookie ? { cookie } : {},
    }),
  );
}

const visitorParam = () => forwarded.last?.nextUrl.searchParams.get("metadata_datafast_visitor_id");

describe("checkout: DataFast visitor id", () => {
  beforeEach(() => {
    forwarded.last = null;
  });

  it("passes the visitor's DataFast cookie to Dodo as metadata", async () => {
    await checkout("", "datafast_visitor_id=abc-123_XYZ");
    expect(visitorParam()).toBe("abc-123_XYZ");
    expect(forwarded.last?.nextUrl.searchParams.get("metadata_userId")).toBe("u1");
  });

  it("sends nothing when there is no cookie", async () => {
    await checkout("");
    expect(visitorParam()).toBeNull();
  });

  it("ignores a value the caller put in the query string", async () => {
    await checkout("&metadata_datafast_visitor_id=forged");
    expect(visitorParam()).toBeNull();
  });

  it("drops a cookie value that is not shaped like an id", async () => {
    await checkout("", "datafast_visitor_id=a%20b%26c");
    expect(visitorParam()).toBeNull();
  });
});
