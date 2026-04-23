import { NextResponse } from "next/server";
import { handleGeneratePost } from "@/app/api/generate/handlers";

const MAX_ITEMS = 12;

export async function POST(request: Request) {
  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const items = Array.isArray((body as { items?: unknown }).items)
    ? (body as { items: unknown[] }).items
    : null;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `At most ${MAX_ITEMS} items per batch` },
      { status: 400 }
    );
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.json({ error: "Missing Host header" }, { status: 400 });
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const generateUrl = `${proto}://${host}/api/generate`;

  const forwardHeaders = new Headers();
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) forwardHeaders.set("x-api-key", apiKey);
  const cookie = request.headers.get("cookie");
  if (cookie) forwardHeaders.set("cookie", cookie);
  const authz = request.headers.get("authorization");
  if (authz) forwardHeaders.set("authorization", authz);
  const results: Array<Record<string, unknown> & { httpStatus: number }> = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const req = new Request(generateUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(item ?? {}),
    });
    const res = await handleGeneratePost(req);
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
    }
    results.push({ ...json, httpStatus: res.status, index: i });
  }

  return NextResponse.json({ results });
}
