import fs from "fs";
import path from "path";
import type { RegenSnapshotV1 } from "@/lib/types/pipelineEnhancements";
import { sourceImageForShot } from "@/lib/images/source";
import { normalizeImageSpecForRender } from "@/lib/images/source";
import type { AlreadyUsedForShots } from "@/lib/images/deriveQuery";

function copyShotAssetBetweenJobs(
  imageUrl: string,
  sourceJobId: string,
  newJobId: string,
  shotId: string,
  cwd: string
): string | null {
  if (!imageUrl.startsWith("/temp/")) return null;
  const rel = imageUrl.replace(/^\//, "");
  const absOld = path.join(cwd, "public", rel);
  if (!fs.existsSync(absOld) || !fs.statSync(absOld).isFile()) return null;
  const ext = path.extname(absOld) || ".png";
  const destDir = path.join(cwd, "public", "temp", newJobId, "images");
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, `shot-${shotId}${ext}`);
  fs.copyFileSync(absOld, dest);
  return `/temp/${newJobId}/images/shot-${shotId}${ext}`;
}

export async function buildImageSpecForRegen(
  snapshot: RegenSnapshotV1,
  newJobId: string,
  regenerateShotIds: string[]
): Promise<ReturnType<typeof normalizeImageSpecForRender>> {
  const regenSet = new Set(regenerateShotIds.filter(Boolean));
  const cwd = process.cwd();
  const alreadyUsedForOtherShots: AlreadyUsedForShots = [];
  const usedImageUrls = new Set<string>();

  const entries = [];
  for (const e of snapshot.imageSpec.entries) {
    if (!regenSet.has(e.shotId)) {
      const copied = copyShotAssetBetweenJobs(
        e.imageUrl,
        snapshot.sourceJobId,
        newJobId,
        e.shotId,
        cwd
      );
      entries.push({
        shotId: e.shotId,
        imageUrl: copied ?? e.imageUrl,
        source: e.source,
        fallbackUsed: e.fallbackUsed,
      });
      continue;
    }

    const shot = snapshot.shotList.shots.find((s) => s.id === e.shotId);
    if (!shot) {
      throw new Error(`Shot regeneration: unknown shot id ${e.shotId}`);
    }

    const result = await sourceImageForShot(
      shot,
      snapshot.script,
      snapshot.intent,
      newJobId,
      false,
      usedImageUrls,
      alreadyUsedForOtherShots
    );
    if (result.searchQuery != null || result.imagePrompt != null) {
      alreadyUsedForOtherShots.push({
        searchQuery: result.searchQuery,
        imagePrompt: result.imagePrompt,
      });
    }
    entries.push({
      shotId: e.shotId,
      imageUrl: result.url,
      source: result.source,
      fallbackUsed: result.fallbackUsed,
    });
  }

  const spec = { entries };
  return normalizeImageSpecForRender(spec, newJobId, cwd);
}
