import { GoogleGenAI } from "@google/genai";
import path from "path";

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10_000;

export async function generateTalkingVideoWithVeo(
  prompt: string,
  _jobId: string,
  outputPath: string
): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Veo video generation requires GEMINI_API_KEY. Set it in .env.local (see .env.example)."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  let operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt,
  });

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    const msg =
      typeof operation.error === "object" && operation.error !== null && "message" in operation.error
        ? String((operation.error as { message?: unknown }).message)
        : String(operation.error);
    throw new Error(`Veo video generation failed: ${msg}`);
  }

  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos?.length || !generatedVideos[0]?.video) {
    throw new Error(
      "Veo video generation completed but no video was returned in the response."
    );
  }

  const videoFile = generatedVideos[0].video;
  const destPath = path.resolve(outputPath);

  try {
    await ai.files.download({
      file: videoFile,
      downloadPath: destPath,
    });
  } catch (downloadErr) {
    const msg = downloadErr instanceof Error ? downloadErr.message : String(downloadErr);
    throw new Error(`Failed to download Veo video to ${outputPath}: ${msg}`);
  }
}
