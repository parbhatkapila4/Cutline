import fs from "fs";
import path from "path";
import type { AssetMetadata, ResolvedAsset } from "@/lib/assets/types";
import {
  fetchAssetBytes,
  getAssetMetadata,
  getLocalAssetPath,
  isAssetId,
  jobUploadIds,
} from "@/lib/assets/storage";
import { getTempDirForJob } from "@/lib/storage/cleanup";

export const ASSET_UNAVAILABLE_MESSAGE =
  "An uploaded file could not be loaded, so this video was not rendered. Please upload it again.";

export class AssetUnavailableError extends Error {
  constructor() {
    super(ASSET_UNAVAILABLE_MESSAGE);
    this.name = "AssetUnavailableError";
  }
}

export type JobAssetRefs = {
  assetIds?: string[];
  avatar?: { mode?: string; uploadAssetId?: string };
  assets?: AssetMetadata[];
};

async function lookupRecord(jobId: string, assetId: string): Promise<AssetMetadata | null> {
  try {
    return await getAssetMetadata(assetId);
  } catch (e) {
    console.error(
      `[assets] jobId=${jobId} asset=${assetId} record lookup failed: ${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  }
}

async function localCopy(jobId: string, meta: AssetMetadata): Promise<string | null> {
  if (meta.storage !== "blob") return getLocalAssetPath(meta);
  const bytes = await fetchAssetBytes(meta);
  if (!bytes) return null;
  const dir = path.join(getTempDirForJob(jobId), "assets");
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(meta.path);
  const filePath = path.join(dir, `${meta.id}${/^\.[a-z0-9]{1,5}$/i.test(ext) ? ext : ".bin"}`);
  fs.writeFileSync(filePath, bytes);
  return filePath;
}

export async function materializeJobAssets(
  jobId: string,
  refs: JobAssetRefs
): Promise<Map<string, ResolvedAsset>> {
  const resolved = new Map<string, ResolvedAsset>();
  for (const id of jobUploadIds(refs)) {
    const meta = refs.assets?.find((a) => a.id === id) ?? (await lookupRecord(jobId, id));
    const filePath = meta && isAssetId(meta.id) ? await localCopy(jobId, meta) : null;
    if (!meta || !filePath) {
      console.error(
        `[assets] jobId=${jobId} asset=${id} unavailable (${meta ? `storage=${meta.storage ?? "local"}` : "no record"}); failing the job`
      );
      throw new AssetUnavailableError();
    }
    resolved.set(id, { meta, filePath });
  }
  return resolved;
}
