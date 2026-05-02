import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const HEYGEN_UPLOAD_BASE = "https://upload.heygen.com/v1";
const HEYGEN_API_BASE = "https://api.heygen.com";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 600_000;

type HeyGenUploadPhotoResponse = {
  code: number;
  data?: {
    talking_photo_id: string;
    talking_photo_url: string;
  };
  message?: string;
};

type HeyGenUploadAssetResponse = {
  code: number;
  data?: {
    id?: string;
    audio_asset_id?: string;
    url?: string;
    audio_url?: string;
    file_type?: string;
  };
  message?: string;
  msg?: string | null;
};

type HeyGenCreateVideoResponse = {
  code?: number;
  data?: {
    video_id?: string;
    id?: string;
  } | null;
  message?: string;
  msg?: string | null;
  error?: null | string | { code?: string; message?: string; detail?: string };
};

function extractHeyGenCreateVideoId(root: unknown): string | undefined {
  if (root === null || typeof root !== "object" || Array.isArray(root)) return undefined;
  const o = root as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const inner = d as Record<string, unknown>;
    const v = inner.video_id ?? inner.videoId ?? inner.id;
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  for (const k of ["video_id", "videoId"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function extractHeyGenApiErrorMessage(root: unknown): string | undefined {
  if (root === null || typeof root !== "object" || Array.isArray(root)) return undefined;
  const o = root as Record<string, unknown>;
  const e = o.error;
  if (e == null) return undefined;
  if (typeof e === "string") return e.trim() || undefined;
  if (typeof e === "object") {
    const eo = e as Record<string, unknown>;
    const msg = eo.message ?? eo.detail ?? eo.code;
    if (typeof msg === "string" && msg.length > 0) return msg;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return undefined;
}

type HeyGenVideoStatus = "pending" | "processing" | "completed" | "failed";

type HeyGenVideoStatusResponse = {
  code: number;
  data?: {
    status: HeyGenVideoStatus;
    video_url?: string;
    error?: {
      detail?: string;
      message?: string;
    };
  };
  message?: string;
};

export type TalkingPhotoStyle = "stable" | "expressive";
export type TalkingPhotoExpression = "default" | "happy";

export type CreateTalkingVideoOptions = {
  dimension?: { width: number; height: number };
  talkingStyle?: TalkingPhotoStyle;
  expression?: TalkingPhotoExpression;
  superResolution?: boolean;
  matting?: boolean;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  scale?: number;
  offsetY?: number;
};

export async function createTalkingVideo(
  imagePathOrUrl: string,
  audioBuffer: Buffer,
  audioFormat: "mp3" | "wav",
  jobId: string,
  outputPath: string,
  options?: CreateTalkingVideoOptions
): Promise<void> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "HEYGEN_API_KEY is required for talking-object mode. Add it to .env.local"
    );
  }

  const opts: Required<Omit<CreateTalkingVideoOptions, "backgroundImageUrl" | "offsetY">> & {
    backgroundImageUrl?: string;
    offsetY?: number;
  } = {
    dimension: options?.dimension ?? { width: 1920, height: 1080 },
    talkingStyle: options?.talkingStyle ?? "expressive",
    expression: options?.expression ?? "happy",
    superResolution: options?.superResolution ?? true,
    matting: options?.matting ?? true,
    backgroundColor: options?.backgroundColor ?? "#1a1a1a",
    scale: options?.scale ?? 1.0,
    backgroundImageUrl: options?.backgroundImageUrl,
    offsetY: options?.offsetY,
  };

  console.log(
    `[heygen] jobId=${jobId} options=` +
    JSON.stringify({
      dimension: opts.dimension,
      talkingStyle: opts.talkingStyle,
      expression: opts.expression,
      superResolution: opts.superResolution,
      matting: opts.matting,
      scale: opts.scale,
    })
  );

  console.log(`[heygen] jobId=${jobId} stage=upload-photo`);
  const talkingPhotoId = await uploadTalkingPhoto(imagePathOrUrl, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=upload-audio`);
  const audioAssetId = await uploadAudioAsset(audioBuffer, audioFormat, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=create-video`);
  const videoId = await createVideo(talkingPhotoId, audioAssetId, apiKey, jobId, opts);

  console.log(`[heygen] jobId=${jobId} stage=poll-status videoId=${videoId}`);
  const videoUrl = await pollVideoStatus(videoId, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=download videoUrl=${videoUrl}`);
  if (opts.matting) {
    await downloadVideo(videoUrl, outputPath, jobId);
    console.log(`[heygen] jobId=${jobId} matting=on skipped chroma-key pass`);
  } else {
    const tempPath = outputPath.replace(/\.mp4$/, "_heygen_temp.mp4");
    await downloadVideo(videoUrl, tempPath, jobId);
    console.log(`[heygen] jobId=${jobId} stage=chroma-key-removal`);
    const chromaKeySuccess = await removeGreenScreen(
      tempPath,
      outputPath,
      jobId,
      opts.dimension,
      opts.backgroundColor
    );
    if (chromaKeySuccess && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        console.warn(`[heygen] jobId=${jobId} failed to delete temp file: ${tempPath}`);
      }
    }
  }

  console.log(`[heygen] jobId=${jobId} completed outputPath=${outputPath}`);
}

async function uploadTalkingPhoto(
  imagePathOrUrl: string,
  apiKey: string,
  jobId: string
): Promise<string> {
  const url = `${HEYGEN_UPLOAD_BASE}/talking_photo`;

  let imageBuffer: Buffer;
  let contentType: string;

  if (imagePathOrUrl.startsWith("http://") || imagePathOrUrl.startsWith("https://")) {
    const response = await fetch(imagePathOrUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download image from URL: ${response.status} ${response.statusText}`
      );
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
    contentType = response.headers.get("content-type") || "image/jpeg";
  } else {
    if (!fs.existsSync(imagePathOrUrl)) {
      throw new Error(`Image file not found: ${imagePathOrUrl}`);
    }
    imageBuffer = fs.readFileSync(imagePathOrUrl);
    const ext = path.extname(imagePathOrUrl).toLowerCase();
    contentType = ext === ".png" ? "image/png" : "image/jpeg";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": contentType,
      },
      body: new Uint8Array(imageBuffer),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HeyGen photo upload timed out for jobId=${jobId}`);
    }
    throw new Error(`HeyGen photo upload failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HeyGen photo upload failed: ${response.status} ${response.statusText}. ${text}`
    );
  }

  const data = (await response.json()) as HeyGenUploadPhotoResponse;
  if (data.code !== 100 || !data.data?.talking_photo_id) {
    throw new Error(
      `HeyGen photo upload failed: ${data.message || "Invalid response"}`
    );
  }

  return data.data.talking_photo_id;
}

async function uploadAudioAsset(
  audioBuffer: Buffer,
  audioFormat: "mp3" | "wav",
  apiKey: string,
  jobId: string
): Promise<string> {
  const url = `${HEYGEN_UPLOAD_BASE}/asset`;
  const contentType = audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": contentType,
      },
      body: new Uint8Array(audioBuffer),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HeyGen audio upload timed out for jobId=${jobId}`);
    }
    throw new Error(`HeyGen audio upload failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HeyGen audio upload failed: ${response.status} ${response.statusText}. ${text}`
    );
  }

  const data = (await response.json()) as HeyGenUploadAssetResponse;
  const audioAssetId =
    data.data?.audio_asset_id ?? data.data?.id;
  if (data.code !== 100 || !audioAssetId) {
    const hint = JSON.stringify(data).slice(0, 500);
    throw new Error(
      `HeyGen audio upload failed: ${data.message || data.msg || "Invalid response"}. Body: ${hint}`
    );
  }

  return audioAssetId;
}

async function createVideo(
  talkingPhotoId: string,
  audioAssetId: string,
  apiKey: string,
  jobId: string,
  opts: {
    dimension: { width: number; height: number };
    talkingStyle: TalkingPhotoStyle;
    expression: TalkingPhotoExpression;
    superResolution: boolean;
    matting: boolean;
    backgroundColor: string;
    backgroundImageUrl?: string;
    scale: number;
    offsetY?: number;
  }
): Promise<string> {
  const url = `${HEYGEN_API_BASE}/v2/video/generate`;

  const character: Record<string, unknown> = {
    type: "talking_photo",
    talking_photo_id: talkingPhotoId,
    talking_style: opts.talkingStyle,
    expression: opts.expression,
    super_resolution: opts.superResolution,
    matting: opts.matting,
    scale: opts.scale,
  };
  if (typeof opts.offsetY === "number" && Number.isFinite(opts.offsetY)) {
    character.offset = { x: 0, y: opts.offsetY };
  }

  const background: Record<string, unknown> = opts.backgroundImageUrl
    ? { type: "image", url: opts.backgroundImageUrl, fit: "cover" }
    : { type: "color", value: opts.backgroundColor };

  const body = {
    caption: false,
    dimension: { width: opts.dimension.width, height: opts.dimension.height },
    video_inputs: [
      {
        character,
        voice: {
          type: "audio",
          audio_asset_id: audioAssetId,
        },
        background,
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HeyGen video creation timed out for jobId=${jobId}`);
    }
    throw new Error(`HeyGen video creation failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(
      `HeyGen video creation failed: ${response.status} ${response.statusText}. ${rawText.slice(0, 800)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as HeyGenCreateVideoResponse;
  } catch {
    throw new Error(
      `HeyGen video creation failed: response was not JSON (first 400 chars): ${rawText.slice(0, 400)}`
    );
  }

  const data = parsed as HeyGenCreateVideoResponse;
  const videoId = extractHeyGenCreateVideoId(parsed);

  const errFromPayload = extractHeyGenApiErrorMessage(parsed);
  if (errFromPayload && !videoId) {
    throw new Error(`HeyGen video creation failed: ${errFromPayload}`);
  }

  if (typeof data.code === "number" && data.code !== 100 && !videoId) {
    throw new Error(
      `HeyGen video creation failed: ${data.message || data.msg || `code ${data.code}`}`
    );
  }

  if (videoId) {
    return videoId;
  }

  const hint = rawText.length > 800 ? `${rawText.slice(0, 800)}…` : rawText;
  throw new Error(
    `HeyGen video creation failed: ${data.message || data.msg || "No video_id in response"}. Raw: ${hint}`
  );
}

async function pollVideoStatus(
  videoId: string,
  apiKey: string,
  jobId: string
): Promise<string> {
  const url = `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        console.warn(`[heygen] jobId=${jobId} status check timed out, retrying...`);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      throw new Error(`HeyGen status check failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `HeyGen status check failed: ${response.status} ${response.statusText}. ${text}`
      );
    }

    const data = (await response.json()) as HeyGenVideoStatusResponse;
    if (data.code !== 100 || !data.data) {
      throw new Error(
        `HeyGen status check failed: ${data.message || "Invalid response"}`
      );
    }

    const status = data.data.status;
    console.log(`[heygen] jobId=${jobId} videoId=${videoId} status=${status}`);

    if (status === "completed") {
      if (!data.data.video_url) {
        throw new Error("HeyGen video completed but no video_url provided");
      }
      return data.data.video_url;
    }

    if (status === "failed") {
      const errorDetail = data.data.error?.detail || data.data.error?.message || "Unknown error";
      throw new Error(`HeyGen video generation failed: ${errorDetail}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `HeyGen video generation timed out after ${MAX_POLL_DURATION_MS / 1000}s for jobId=${jobId}`
  );
}

async function downloadVideo(
  videoUrl: string,
  outputPath: string,
  jobId: string
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(videoUrl, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`HeyGen video download timed out for jobId=${jobId}`);
    }
    throw new Error(`HeyGen video download failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(
      `HeyGen video download failed: ${response.status} ${response.statusText}`
    );
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(outputPath, videoBuffer);
}

async function removeGreenScreen(
  inputPath: string,
  outputPath: string,
  jobId: string,
  dimension: { width: number; height: number } = { width: 1920, height: 1080 },
  backgroundColor: string = "#1a1a1a"
): Promise<boolean> {
  const ffmpegPath = process.env.FFMPEG_PATH?.trim() || "ffmpeg";

  const checkFfmpeg = spawnSync(ffmpegPath, ["-version"], { encoding: "utf-8" });
  if (checkFfmpeg.error || checkFfmpeg.status !== 0) {
    console.warn(
      `[heygen] jobId=${jobId} ffmpeg not found. Skipping chroma-key removal. ` +
      `Install ffmpeg to remove green screen: https://ffmpeg.org/download.html`
    );
    if (inputPath !== outputPath) {
      fs.copyFileSync(inputPath, outputPath);
    }
    return false;
  }

  const sizeArg = `${dimension.width}x${dimension.height}`;
  const result = spawnSync(
    ffmpegPath,
    [
      "-i", inputPath,
      "-filter_complex",
      `[0:v]colorkey=0x00FF00:0.3:0.2[ckout];color=c=${backgroundColor}:s=${sizeArg}:d=60[bg];[bg][ckout]overlay=(W-w)/2:(H-h)/2[out]`,
      "-map", "[out]",
      "-map", "0:a?",
      "-c:a", "copy",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-y",
      outputPath,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      timeout: 180_000,
    }
  );

  if (result.error || result.status !== 0) {
    const stderr = result.stderr || "";
    console.warn(
      `[heygen] jobId=${jobId} ffmpeg chroma-key failed: ${stderr.slice(0, 200)}. Using original video.`
    );
    if (inputPath !== outputPath && !fs.existsSync(outputPath)) {
      fs.copyFileSync(inputPath, outputPath);
    }
    return false;
  }

  console.log(`[heygen] jobId=${jobId} chroma-key removal successful`);
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
