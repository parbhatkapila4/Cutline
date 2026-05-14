import fs from "fs";
import path from "path";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export type GenerateResult = { url: string } | null;

export async function generateImageWithDalle(
  prompt: string,
  options?: { outputDir?: string; filename?: string }
): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return null;
  }

  const body = {
    model: "dall-e-3",
    prompt: prompt.slice(0, 4000),
    n: 1,
    size: "1792x1024" as const,
    quality: "hd" as const,
    response_format: (options?.outputDir ? "b64_json" : "url") as "url" | "b64_json",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
      if (response.status === 401 || response.status === 403) {
        console.warn("[images] DALL·E: invalid or missing OpenAI API key.");
      }
      return null;
    }
    throw new Error(`DALL·E failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };
  const first = data.data?.[0];
  if (!first) return null;

  if (options?.outputDir && options?.filename && first.b64_json) {
    const dir = options.outputDir;
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, options.filename);
    const buffer = Buffer.from(first.b64_json, "base64");
    fs.writeFileSync(filePath, buffer);
    return { url: filePath };
  }

  if (typeof first.url === "string" && first.url) {
    return { url: first.url };
  }

  return null;
}
