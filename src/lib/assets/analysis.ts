import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  getAssetFilePath,
  getAssetMetadata,
} from "@/lib/assets/storage";
import type {
  AnalyzedAssets,
  BrandColors,
  LogoAnalysis,
  ProductPhotoAnalysis,
  ReferenceImageAnalysis,
  ReferenceVideoAnalysis,
} from "@/lib/assets/types";
import type { AssetMetadata } from "@/lib/assets/types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_VISION_MODEL = "anthropic/claude-3.5-haiku";
const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

function normalizeHex(s: string): string {
  const t = s.trim();
  if (HEX_REGEX.test(t)) return t;
  if (/^[A-Fa-f0-9]{6}$/.test(t)) return `#${t}`;
  if (/^[A-Fa-f0-9]{3}$/.test(t)) return `#${t}`;
  return t;
}

function isValidPlacement(
  s: string
): s is LogoAnalysis["suggestedPlacement"] {
  return s === "outro" || s === "watermark" || s === "hero";
}

function isValidShotType(
  s: string
): s is ProductPhotoAnalysis["suggestedShotTypes"][number] {
  return ["establish", "detail", "hero", "transition"].includes(s);
}

async function visionAnalyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemPrompt?: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model =
    process.env.OPENROUTER_VISION_MODEL ??
    process.env.OPENROUTER_MODEL ??
    DEFAULT_VISION_MODEL;

  if (!apiKey?.trim()) {
    throw new Error("OPENROUTER_API_KEY is not set. Add your key to .env.local");
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: dataUrl } },
  ];

  const messages: Array<{ role: string; content: string | typeof content }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content });

  const body = {
    model,
    messages,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" as const },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Vision API failed: ${response.status}. ${response.status === 401 ? "Check your API key." : text || ""}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Vision API returned empty content");
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Vision API returned invalid JSON");
  }
}

function readImageAsBase64(filePath: string, mimeType: string): string {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("base64");
}

async function analyzeLogo(meta: AssetMetadata): Promise<LogoAnalysis> {
  const filePath = getAssetFilePath(meta.id);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Logo asset file not found: ${meta.id}`);
  }

  const prompt = `Analyze this logo image. Return a single JSON object with exactly these keys (no markdown, no explanation):
- dominantColors: array of 2-3 hex color strings (e.g. ["#000000", "#ffffff"])
- aspectRatio: number (width / height, e.g. 1.5 for 3:2)
- hasTransparency: boolean (true if PNG/SVG with transparency or transparent areas)
- suggestedPlacement: one of "outro" | "watermark" | "hero" (best use for this logo in a short video)`;

  const systemPrompt =
    "You are an asset analyst for a video editing system. Output only valid JSON with the requested keys.";

  const base64 = readImageAsBase64(filePath, meta.mimeType);
  const raw = await visionAnalyzeImage(
    base64,
    meta.mimeType,
    prompt,
    systemPrompt
  );

  const dominantColors = Array.isArray(raw.dominantColors)
    ? (raw.dominantColors as unknown[]).map((c) =>
      normalizeHex(String(c))
    )
    : [];
  const aspectRatio =
    typeof raw.aspectRatio === "number" && raw.aspectRatio > 0
      ? raw.aspectRatio
      : 1;
  const hasTransparency =
    typeof raw.hasTransparency === "boolean" ? raw.hasTransparency : false;
  const suggestedPlacement = isValidPlacement(String(raw.suggestedPlacement ?? "watermark"))
    ? (raw.suggestedPlacement as LogoAnalysis["suggestedPlacement"])
    : "watermark";

  return {
    dominantColors: dominantColors.length >= 2 ? dominantColors : ["#000000", "#ffffff"],
    aspectRatio,
    hasTransparency,
    suggestedPlacement,
  };
}

async function analyzeProductPhoto(
  meta: AssetMetadata
): Promise<ProductPhotoAnalysis> {
  const filePath = getAssetFilePath(meta.id);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Product photo asset file not found: ${meta.id}`);
  }

  const prompt = `Analyze this product photo. Return a single JSON object with exactly these keys (no markdown, no explanation):
- dominantColors: array of 2-4 hex color strings (e.g. ["#1a1a2e", "#e8e8e8"])
- aspectRatio: number (width / height)
- subjectDescription: one short sentence describing the main subject (for matching to video shots)
- suggestedShotTypes: array of one or more of "establish" | "detail" | "hero" | "transition" (best shot types for this image in a video)`;

  const systemPrompt =
    "You are an asset analyst for a video editing system. Output only valid JSON with the requested keys.";

  const base64 = readImageAsBase64(filePath, meta.mimeType);
  const raw = await visionAnalyzeImage(
    base64,
    meta.mimeType,
    prompt,
    systemPrompt
  );

  const dominantColors = Array.isArray(raw.dominantColors)
    ? (raw.dominantColors as unknown[]).map((c) => normalizeHex(String(c)))
    : [];
  const aspectRatio =
    typeof raw.aspectRatio === "number" && raw.aspectRatio > 0
      ? raw.aspectRatio
      : 16 / 9;
  const subjectDescription =
    typeof raw.subjectDescription === "string" && raw.subjectDescription.trim()
      ? String(raw.subjectDescription).trim()
      : "Product or subject in frame";
  const suggestedShotTypesRaw = Array.isArray(raw.suggestedShotTypes)
    ? (raw.suggestedShotTypes as unknown[])
      .map((s) => String(s))
      .filter(isValidShotType)
    : ["establish"];
  const suggestedShotTypes = (
    suggestedShotTypesRaw.length >= 1 ? suggestedShotTypesRaw : ["establish"]
  ) as ProductPhotoAnalysis["suggestedShotTypes"];

  return {
    dominantColors:
      dominantColors.length >= 1 ? dominantColors : ["#1a1a2e"],
    aspectRatio,
    subjectDescription,
    suggestedShotTypes,
  };
}

async function analyzeReferenceImage(
  meta: AssetMetadata
): Promise<ReferenceImageAnalysis> {
  const filePath = getAssetFilePath(meta.id);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Reference image asset file not found: ${meta.id}`);
  }

  const prompt = `Analyze this reference image for visual style. Return a single JSON object with exactly these keys (no markdown, no explanation):
- colorPalette: array of 3-5 hex color strings that represent the image's color palette (e.g. ["#1a1a2e", "#e94560", "#f8b500"])
- moodDescription: one short sentence describing the mood or visual style (e.g. "Dark, cinematic, high contrast")`;

  const systemPrompt =
    "You are an asset analyst for a video editing system. Output only valid JSON with the requested keys.";

  const base64 = readImageAsBase64(filePath, meta.mimeType);
  const raw = await visionAnalyzeImage(
    base64,
    meta.mimeType,
    prompt,
    systemPrompt
  );

  const colorPalette = Array.isArray(raw.colorPalette)
    ? (raw.colorPalette as unknown[]).map((c) => normalizeHex(String(c)))
    : [];
  const moodDescription =
    typeof raw.moodDescription === "string" && raw.moodDescription.trim()
      ? String(raw.moodDescription).trim()
      : "Neutral, clean";

  return {
    colorPalette: colorPalette.length >= 3 ? colorPalette : ["#1a1a2e", "#e8e8e8", "#666666"],
    moodDescription,
  };
}

function extractKeyframes(videoPath: string, assetId: string): string[] {
  const cwd = process.cwd();
  const uploadDir = path.join(cwd, process.env.UPLOAD_DIR ?? "uploads");
  const keyframesDir = path.join(uploadDir, "_keyframes", assetId);
  fs.mkdirSync(keyframesDir, { recursive: true });

  let durationSec = 30;
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: "utf-8", maxBuffer: 1024 * 1024 }
    );
    const d = parseFloat(out.trim());
    if (Number.isFinite(d) && d > 0) durationSec = d;
  } catch {
  }

  const numFrames = 5;
  const paths: string[] = [];

  for (let i = 0; i < numFrames; i++) {
    const t = i === 0 ? 0 : (durationSec * i) / (numFrames - 1);
    const outPath = path.join(keyframesDir, `frame_${i}.png`);
    try {
      execSync(
        `ffmpeg -ss ${t} -i "${videoPath}" -vframes 1 -q:v 2 "${outPath}" -y`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );
      if (fs.existsSync(outPath)) paths.push(outPath);
    } catch {
    }
  }

  return paths;
}

function detectCutsPerMinute(videoPath: string): number | undefined {
  try {
    const escaped = videoPath.replace(/"/g, '\\"');
    const out = execSync(
      `ffmpeg -i "${escaped}" -vf "select=gt(scene\\,0),showinfo" -f null - 2>&1`,
      {
        encoding: "utf-8",
        maxBuffer: 2 * 1024 * 1024,
        ...(process.platform === "win32" ? { shell: true } : {}),
      } as import("child_process").ExecSyncOptionsWithStringEncoding
    );
    const ptsMatches = out.match(/pts_time:[^\s]+/g);
    const numScenes = ptsMatches ? ptsMatches.length : 0;
    const durMatch = out.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    let durationSec = 30;
    if (durMatch) {
      durationSec =
        parseInt(durMatch[1], 10) * 3600 +
        parseInt(durMatch[2], 10) * 60 +
        parseFloat(durMatch[3]);
    }
    if (durationSec <= 0 || numScenes === 0) return undefined;
    const cutsPerMinute = (numScenes / durationSec) * 60;
    return Math.round(cutsPerMinute);
  } catch {
    return undefined;
  }
}

async function analyzeReferenceVideo(
  meta: AssetMetadata
): Promise<ReferenceVideoAnalysis> {
  const filePath = getAssetFilePath(meta.id);
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Reference video asset file not found: ${meta.id}`);
  }

  const keyFramePaths = extractKeyframes(filePath, meta.id);
  const cutsPerMinute = detectCutsPerMinute(filePath);

  const colorPaletteSet = new Set<string>();
  const systemPrompt =
    "You are an asset analyst for a video editing system. Output only valid JSON with the requested key.";
  const prompt = `Describe the dominant colors in this video frame as a JSON object with one key: colorPalette: array of 3-5 hex color strings (e.g. ["#1a1a2e", "#e94560"]). No markdown, no explanation.`;

  for (const framePath of keyFramePaths.slice(0, 3)) {
    try {
      const buffer = fs.readFileSync(framePath);
      const base64 = buffer.toString("base64");
      const raw = await visionAnalyzeImage(
        base64,
        "image/png",
        prompt,
        systemPrompt
      );
      const pal = Array.isArray(raw.colorPalette)
        ? (raw.colorPalette as unknown[]).map((c) => normalizeHex(String(c)))
        : [];
      pal.forEach((c) => colorPaletteSet.add(c));
    } catch {
    }
  }

  const colorPalette = Array.from(colorPaletteSet);
  return {
    keyFramePaths,
    colorPalette: colorPalette.length >= 1 ? colorPalette : ["#1a1a2e", "#e8e8e8"],
    ...(cutsPerMinute !== undefined ? { cutsPerMinute } : {}),
  };
}

function analyzeBrandColors(brandColors: BrandColors): {
  primary: string;
  secondary?: string;
} {
  const primary = normalizeHex(brandColors.primary);
  const secondary = brandColors.secondary
    ? normalizeHex(brandColors.secondary)
    : undefined;
  return { primary, ...(secondary ? { secondary } : {}) };
}

export async function analyzeAssets(
  assetIds: string[],
  brandColors?: BrandColors
): Promise<AnalyzedAssets> {
  const result: AnalyzedAssets = {};

  if (brandColors) {
    result.brandColors = analyzeBrandColors(brandColors);
  }

  const logos: AssetMetadata[] = [];
  const productPhotos: AssetMetadata[] = [];
  const referenceVideos: AssetMetadata[] = [];
  const referenceImages: AssetMetadata[] = [];

  for (const id of assetIds) {
    const meta = getAssetMetadata(id);
    if (!meta) continue;
    switch (meta.type) {
      case "logo":
        logos.push(meta);
        break;
      case "productPhoto":
        productPhotos.push(meta);
        break;
      case "referenceVideo":
        referenceVideos.push(meta);
        break;
      case "referenceImage":
        referenceImages.push(meta);
        break;
      default:
        break;
    }
  }

  if (logos.length > 0) {
    result.logo = await analyzeLogo(logos[0]!);
  }

  if (productPhotos.length > 0) {
    result.productPhotos = await Promise.all(
      productPhotos.map((m) => analyzeProductPhoto(m))
    );
  }

  if (referenceVideos.length > 0) {
    result.referenceVideo = await analyzeReferenceVideo(referenceVideos[0]!);
  }

  if (referenceImages.length > 0) {
    result.referenceImages = await Promise.all(
      referenceImages.map((m) => analyzeReferenceImage(m))
    );
  }

  return result;
}
