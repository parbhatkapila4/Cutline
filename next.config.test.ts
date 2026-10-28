import { describe, it, expect } from "vitest";
import nextConfig from "./next.config";

async function policy(): Promise<string> {
  const rules = (await nextConfig.headers?.()) ?? [];
  const header = rules
    .flatMap((rule) => rule.headers)
    .find((h) => h.key === "Content-Security-Policy");
  if (!header) throw new Error("no Content-Security-Policy header is configured");
  return header.value;
}

function sources(csp: string, directive: string): string[] {
  const entry = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${directive} `));
  return entry ? entry.split(/\s+/).slice(1) : [];
}

const allows = (list: string[], origin: string) =>
  list.includes(origin) || list.includes(new URL(origin).protocol);

describe("content security policy", () => {
  it("lets the analytics scripts load, Google Analytics and DataFast", async () => {
    const scripts = sources(await policy(), "script-src");
    expect(allows(scripts, "https://www.googletagmanager.com")).toBe(true);
    expect(allows(scripts, "https://datafa.st")).toBe(true);
  });

  it("lets the page send DataFast its events", async () => {
    expect(allows(sources(await policy(), "connect-src"), "https://datafa.st")).toBe(true);
  });

  it("still keeps scripts from arbitrary hosts out", async () => {
    expect(allows(sources(await policy(), "script-src"), "https://evil.example")).toBe(false);
  });
});
