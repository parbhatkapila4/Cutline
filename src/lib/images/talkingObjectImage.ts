
import fs from "fs";
import path from "path";
import { generateImageWithDalle } from "./generate";

const FALLBACK_IMAGE_BASENAME = "fallback.png";
const TALKING_OBJECT_FILENAME = "talking-object.png";

export async function getTalkingObjectImagePath(
  mainSubject: string,
  jobId: string,
  outputDir: string
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  const prompt = `Friendly cartoon ${mainSubject} character with expressive face (eyes, eyebrows, nose, mouth) and simple hands, clean design, front view, suitable for animation, solid color or minimal background.`;

  let result: { url: string } | null = null;
  try {
    result = await generateImageWithDalle(prompt, {
      outputDir,
      filename: TALKING_OBJECT_FILENAME,
    });
  } catch (e) {
    console.warn(
      `[images] jobId=${jobId} DALL·E talking-object image failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (result?.url) {
    const savedPath = path.resolve(outputDir, TALKING_OBJECT_FILENAME);
    if (fs.existsSync(savedPath)) {
      return savedPath;
    }
  }

  const cwd = process.cwd();
  const fallbackSrc = path.join(cwd, "public", FALLBACK_IMAGE_BASENAME);
  const fallbackDest = path.join(outputDir, TALKING_OBJECT_FILENAME);

  if (fs.existsSync(fallbackSrc)) {
    fs.copyFileSync(fallbackSrc, fallbackDest);
    return path.resolve(fallbackDest);
  }

  return path.resolve(fallbackDest);
}
