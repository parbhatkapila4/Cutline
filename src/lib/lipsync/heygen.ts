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
    audio_asset_id: string;
    audio_url: string;
  };
  message?: string;
};

type HeyGenCreateVideoResponse = {
  code: number;
  data?: {
    video_id: string;
  };
  message?: string;
};

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

export async function createTalkingVideo(
  imagePathOrUrl: string,
  audioBuffer: Buffer,
  audioFormat: "mp3" | "wav",
  jobId: string,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "HEYGEN_API_KEY is required for talking-object mode. Add it to .env.local"
    );
  }

  console.log(`[heygen] jobId=${jobId} stage=upload-photo`);
  const talkingPhotoId = await uploadTalkingPhoto(imagePathOrUrl, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=upload-audio`);
  const audioAssetId = await uploadAudioAsset(audioBuffer, audioFormat, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=create-video`);
  const videoId = await createVideo(talkingPhotoId, audioAssetId, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=poll-status videoId=${videoId}`);
  const videoUrl = await pollVideoStatus(videoId, apiKey, jobId);

  console.log(`[heygen] jobId=${jobId} stage=download videoUrl=${videoUrl}`);
  const tempPath = outputPath.replace(/\.mp4$/, "_heygen_temp.mp4");
  await downloadVideo(videoUrl, tempPath, jobId);

  console.log(`[heygen] jobId=${jobId} stage=chroma-key-removal`);
  const chromaKeySuccess = await removeGreenScreen(tempPath, outputPath, jobId);

  if (chromaKeySuccess && fs.existsSync(tempPath)) {
    try {
      fs.unlinkSync(tempPath);
    } catch (e) {
      console.warn(`[heygen] jobId=${jobId} failed to delete temp file: ${tempPath}`);
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
  if (data.code !== 100 || !data.data?.audio_asset_id) {
    throw new Error(
      `HeyGen audio upload failed: ${data.message || "Invalid response"}`
    );
  }

  return data.data.audio_asset_id;
}

async function createVideo(
  talkingPhotoId: string,
  audioAssetId: string,
  apiKey: string,
  jobId: string
): Promise<string> {
  const url = `${HEYGEN_API_BASE}/v2/video/generate`;

  const body = {
    video_inputs: [
      {
        character: {
          type: "talking_photo",
          talking_photo_id: talkingPhotoId,
        },
        voice: {
          type: "audio",
          audio_asset_id: audioAssetId,
        },
        background: {
          type: "color",
          value: "#1a1a1a",
        },
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
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HeyGen video creation failed: ${response.status} ${response.statusText}. ${text}`
    );
  }

  const data = (await response.json()) as HeyGenCreateVideoResponse;
  if (data.code !== 100 || !data.data?.video_id) {
    throw new Error(
      `HeyGen video creation failed: ${data.message || "Invalid response"}`
    );
  }

  return data.data.video_id;
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
          "X-Api-Key": apiKey,
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
  jobId: string
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

  const result = spawnSync(
    ffmpegPath,
    [
      "-i", inputPath,
      "-filter_complex",
      "[0:v]colorkey=0x00FF00:0.3:0.2[ckout];color=c=#1a1a1a:s=1920x1080:d=60[bg];[bg][ckout]overlay[out]",
      "-map", "[out]",
      "-map", "0:a?",
      "-c:a", "copy",
      "-c:v", "libx264",
      "-preset", "fast",
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
