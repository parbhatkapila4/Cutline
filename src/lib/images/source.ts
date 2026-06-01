import fs from "fs";
import path from "path";
import type { Intent, ShotList, Script } from "@/lib/types";
import type { Shot } from "@/lib/types";
import type { AnalyzedAssets } from "@/lib/assets/types";
import type { ImageSpec, ImageSpecEntry, ImageSource } from "@/lib/images/types";
import { deriveImageQuery, type AlreadyUsedForShots } from "@/lib/images/deriveQuery";
import { searchUnsplash, searchUnsplashMultiple, type UnsplashOrientation } from "@/lib/images/unsplash";
import { searchPexels, searchPexelsMultiple, type PexelsOrientation } from "@/lib/images/pexels";
import { generateImageWithDalle } from "@/lib/images/generate";
import {
  retry,
  getRetryConfig,
  shouldRetryForLLM,
  shouldRetryForImage,
} from "@/lib/utils/retry";

export type AssetPaths = {
  logo?: string;
  productPhotos?: string[];
};

const SHOT_PURPOSE_TO_SUGGESTED = new Map<string, string[]>([
  ["establish", ["establish", "hero"]],
  ["reveal", ["hero", "establish"]],
  ["emphasize", ["detail", "hero"]],
  ["transition", ["transition"]],
  ["hold", ["detail", "hero", "transition"]],
]);

function assignUserPhotosToShots(
  shots: Shot[],
  productPhotoPaths: string[],
  analyzedProductPhotos?: Array<{ suggestedShotTypes: string[] }>
): Map<string, string> {
  const assigned = new Map<string, string>();
  const used = new Set<number>();

  const sortedShots = [...shots].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const shot of sortedShots) {
    const allowed = SHOT_PURPOSE_TO_SUGGESTED.get(shot.purpose) ?? ["establish", "detail", "hero", "transition"];
    for (let i = 0; i < (analyzedProductPhotos?.length ?? productPhotoPaths.length); i++) {
      if (used.has(i)) continue;
      const path = productPhotoPaths[i];
      if (!path) continue;
      const analysis = analyzedProductPhotos?.[i];
      const types = analysis?.suggestedShotTypes ?? ["establish"];
      const match = types.some((t) => allowed.includes(t));
      if (match) {
        assigned.set(shot.id, path);
        used.add(i);
        break;
      }
    }
  }
  return assigned;
}

function toImageUrl(filePath: string, jobId?: string): string {
  void jobId;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const cwd = process.cwd();
  const publicDir = path.join(cwd, "public");
  if (filePath.startsWith(publicDir)) {
    const relative = path.relative(publicDir, filePath).replace(/\\/g, "/");
    return `/${relative}`;
  }
  return filePath;
}

const FALLBACK_IMAGE_PATH = "/fallback.png";

function aspectRatioToOrientation(
  ratio?: string
): "landscape" | "portrait" | "square" {
  if (!ratio || typeof ratio !== "string") return "landscape";
  const parts = ratio.split(":");
  if (parts.length !== 2) return "landscape";
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return "landscape";
  }
  const r = w / h;
  if (r < 0.7) return "portrait";
  if (r <= 1.3) return "square";
  return "landscape";
}

function toUnsplashOrientation(
  o: "landscape" | "portrait" | "square"
): UnsplashOrientation {
  return o === "square" ? "squarish" : o;
}

function toPexelsOrientation(
  o: "landscape" | "portrait" | "square"
): PexelsOrientation {
  return o;
}

function normalizeImageUrl(url: string): string {
  if (!url || url === FALLBACK_IMAGE_PATH || url.startsWith("data:")) return url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      return parsed.origin + parsed.pathname;
    }
  } catch {
  }
  return url;
}

function pickUnusedUrl(urls: string[], usedNormalizedUrls: Set<string>): string | null {
  for (const u of urls) {
    if (u && !usedNormalizedUrls.has(normalizeImageUrl(u))) return u;
  }
  return null;
}

export async function sourceImageForShot(
  shot: Shot,
  script: Script,
  intent: Intent,
  jobId?: string,
  stockOnly?: boolean,
  usedUrls?: Set<string>,
  alreadyUsedForOtherShots?: AlreadyUsedForShots,
  aspectRatio?: string
): Promise<{ url: string; source: ImageSource; fallbackUsed: boolean; searchQuery?: string; imagePrompt?: string }> {
  const retryConfig = getRetryConfig();
  const used = usedUrls ?? new Set<string>();
  const addUsed = (u: string) => {
    if (u && u !== FALLBACK_IMAGE_PATH && !u.startsWith("data:")) used.add(normalizeImageUrl(u));
  };

  const orientation = aspectRatioToOrientation(aspectRatio);
  const unsplashOrient = toUnsplashOrientation(orientation);
  const pexelsOrient = toPexelsOrientation(orientation);

  const { searchQuery, imagePrompt } = await retry(
    () => deriveImageQuery(shot, script, intent, alreadyUsedForOtherShots),
    {
      maxRetries: retryConfig.llm.maxRetries,
      backoffMs: retryConfig.llm.backoffMs,
      shouldRetry: shouldRetryForLLM,
      label: "LLM (Image query)",
    }
  );

  const outputDir = jobId ? path.join(process.cwd(), "public", "temp", jobId, "images") : undefined;
  const filename = outputDir ? `shot-${shot.id}.png` : undefined;

  const imageRetryOpts = {
    maxRetries: retryConfig.image.maxRetries,
    backoffMs: retryConfig.image.backoffMs,
    shouldRetry: shouldRetryForImage,
  };

  let url: string | null = null;

  const unsplashMultiple = await retry(
    () => searchUnsplashMultiple(searchQuery, 15, unsplashOrient),
    { ...imageRetryOpts, label: "Unsplash (multiple)" }
  );
  url = pickUnusedUrl(unsplashMultiple, used);
  if (url) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: false, searchQuery, imagePrompt };
  }

  const unsplashResult = await retry(
    () => searchUnsplash(searchQuery, unsplashOrient),
    { ...imageRetryOpts, label: "Unsplash" }
  );
  url = unsplashResult?.url ?? null;
  if (url && !used.has(normalizeImageUrl(url))) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: false, searchQuery, imagePrompt };
  }

  const pexelsMultiple = await retry(
    () => searchPexelsMultiple(searchQuery, 15, pexelsOrient),
    { ...imageRetryOpts, label: "Pexels (multiple)" }
  );
  url = pickUnusedUrl(pexelsMultiple, used);
  if (url) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: true, searchQuery, imagePrompt };
  }

  const pexelsResult = await retry(
    () => searchPexels(searchQuery, pexelsOrient),
    { ...imageRetryOpts, label: "Pexels" }
  );
  url = pexelsResult?.url ?? null;
  if (url && !used.has(normalizeImageUrl(url))) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: true, searchQuery, imagePrompt };
  }

  if (!stockOnly) {
    const dalleOpts = outputDir && filename ? { outputDir, filename } : undefined;
    const dalleResult = await retry(
      () => generateImageWithDalle(imagePrompt, dalleOpts),
      { ...imageRetryOpts, label: "DALL·E" }
    );
    if (dalleResult?.url) {
      url = outputDir && filename && !dalleResult.url.startsWith("http")
        ? toImageUrl(dalleResult.url, jobId)
        : dalleResult.url;
      if (url) {
        addUsed(url);
        return { url, source: "ai-generated", fallbackUsed: true, searchQuery, imagePrompt };
      }
    }
  }

  const simplifiedQuery = searchQuery.split(/\s+/).slice(0, 3).join(" ") || "abstract visual";

  const unsplashSimplified = await retry(
    () => searchUnsplash(simplifiedQuery, unsplashOrient),
    { ...imageRetryOpts, label: "Unsplash (simplified)" }
  );
  url = unsplashSimplified?.url ?? null;
  if (url && !used.has(normalizeImageUrl(url))) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: true, searchQuery, imagePrompt };
  }

  const pexelsSimplified = await retry(
    () => searchPexels(simplifiedQuery, pexelsOrient),
    { ...imageRetryOpts, label: "Pexels (simplified)" }
  );
  url = pexelsSimplified?.url ?? null;
  if (url && !used.has(normalizeImageUrl(url))) {
    addUsed(url);
    return { url, source: "stock", fallbackUsed: true, searchQuery, imagePrompt };
  }

  if (!stockOnly) {
    const dalleOpts = outputDir && filename ? { outputDir, filename } : undefined;
    const dalleSimplified = await retry(
      () => generateImageWithDalle(`Simple scene: ${simplifiedQuery}`, dalleOpts),
      { ...imageRetryOpts, label: "DALL·E (simplified)" }
    );
    if (dalleSimplified?.url) {
      url = outputDir && filename && !dalleSimplified.url.startsWith("http")
        ? toImageUrl(dalleSimplified.url, jobId)
        : dalleSimplified.url;
      if (url) {
        addUsed(url);
        return { url, source: "ai-generated", fallbackUsed: true, searchQuery, imagePrompt };
      }
    }
  }

  console.warn(
    `[images] No image for shot ${shot.id} (query: ${searchQuery}). Using placeholder. Set UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, or OPENAI_API_KEY for real images.`
  );
  return { url: FALLBACK_IMAGE_PATH, source: "stock", fallbackUsed: true, searchQuery, imagePrompt };
}

export async function sourceImages(
  intent: Intent,
  shotList: ShotList,
  script: Script,
  analyzedAssets?: AnalyzedAssets,
  assetPaths?: AssetPaths,
  jobId?: string,
  stockOnly?: boolean,
  aspectRatio?: string
): Promise<ImageSpec> {
  const shots = [...(shotList.shots ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const productPhotoPaths = assetPaths?.productPhotos ?? [];
  const hasUserPhotos = productPhotoPaths.length > 0 && productPhotoPaths.every((p) => typeof p === "string");

  const userAssigned = hasUserPhotos
    ? assignUserPhotosToShots(
      shots,
      productPhotoPaths as string[],
      analyzedAssets?.productPhotos
    )
    : new Map<string, string>();

  const entries: ImageSpecEntry[] = [];
  const usedImageUrls = new Set<string>();
  const alreadyUsedForOtherShots: AlreadyUsedForShots = [];

  for (const shot of shots) {
    const userPath = userAssigned.get(shot.id);
    if (userPath && fs.existsSync(userPath)) {
      const url = toImageUrl(userPath, jobId);
      if (url) usedImageUrls.add(normalizeImageUrl(url));
      entries.push({
        shotId: shot.id,
        imageUrl: url,
        source: "user",
        fallbackUsed: false,
      });
      continue;
    }

    const result = await sourceImageForShot(shot, script, intent, jobId, stockOnly, usedImageUrls, alreadyUsedForOtherShots, aspectRatio);
    if (result.searchQuery != null || result.imagePrompt != null) {
      alreadyUsedForOtherShots.push({ searchQuery: result.searchQuery, imagePrompt: result.imagePrompt });
    }
    entries.push({
      shotId: shot.id,
      imageUrl: result.url,
      source: result.source,
      fallbackUsed: result.fallbackUsed,
    });
  }

  const committedNormalized = new Set<string>();
  for (let j = 0; j < entries.length; j++) {
    const norm = normalizeImageUrl(entries[j]!.imageUrl);
    if (committedNormalized.has(norm) && entries[j]!.imageUrl !== FALLBACK_IMAGE_PATH) {
      const shot = shots[j]!;
      const replacement = await sourceImageForShot(shot, script, intent, jobId, stockOnly, new Set(committedNormalized), alreadyUsedForOtherShots, aspectRatio);
      entries[j] = {
        shotId: shot.id,
        imageUrl: replacement.url,
        source: replacement.source,
        fallbackUsed: replacement.fallbackUsed,
      };
      committedNormalized.add(normalizeImageUrl(replacement.url));
    } else {
      committedNormalized.add(norm);
    }
  }

  return { entries };
}

export function normalizeImageSpecForRender(
  imageSpec: ImageSpec,
  jobId: string,
  cwd: string
): ImageSpec {
  const publicDir = path.join(cwd, "public");
  const imagesDir = path.join(publicDir, "temp", jobId, "images");
  const entries = imageSpec.entries.map((entry) => {
    const url = entry.imageUrl;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
      return entry;
    }
    const localPath = path.isAbsolute(url) ? url : path.join(cwd, url);
    if (!fs.existsSync(localPath)) return entry;
    fs.mkdirSync(imagesDir, { recursive: true });
    const ext = path.extname(localPath) || ".png";
    const filename = `shot-${entry.shotId}${ext}`;
    const destPath = path.join(imagesDir, filename);
    try {
      fs.copyFileSync(localPath, destPath);
    } catch {
      return entry;
    }
    const webPath = `/temp/${jobId}/images/${filename}`;
    return { ...entry, imageUrl: webPath };
  });
  return { entries };
}
