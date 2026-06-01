import { config as loadEnv } from "dotenv";
import path from "path";
import {
  listTalkingPhotos,
  deleteTalkingPhoto,
} from "../src/lib/lipsync/heygenAvatarManager";
import { getAllCachedTalkingPhotoIds } from "../src/lib/lipsync/heygenPhotoCache";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv();

function parseFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseNumber(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main(): Promise<void> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey?.trim()) {
    console.error("HEYGEN_API_KEY is not set. Put it in .env.local first.");
    process.exit(1);
  }

  const yes = parseFlag("yes");
  const includeCached = parseFlag("include-cached");
  const concurrency = Math.max(1, Math.min(50, parseNumber("concurrency", 10)));

  console.log("[cleanup] listing HeyGen photo avatars (this can take a moment)...");
  const all = await listTalkingPhotos(apiKey);
  console.log(`[cleanup] account has ${all.length} avatar(s) total`);

  const cached = getAllCachedTalkingPhotoIds();
  const orphans = all.filter((p) => !cached.has(p.id));
  const cachedHere = all.filter((p) => cached.has(p.id));
  console.log(
    `[cleanup] partitioned: ${orphans.length} orphan(s), ${cachedHere.length} cached`
  );

  const toDelete = includeCached ? all : orphans;
  if (toDelete.length === 0) {
    console.log("[cleanup] nothing to delete. Done.");
    return;
  }

  console.log(
    `[cleanup] will delete ${toDelete.length} avatar(s) ` +
    `(concurrency=${concurrency})${includeCached ? " — INCLUDING cached" : ""}`
  );

  if (!yes) {
    console.log("[cleanup] DRY RUN. Pass --yes to actually delete.");
    return;
  }

  const start = Date.now();
  let freed = 0;
  let failed = 0;
  const targets = toDelete
    .slice()
    .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0))
    .map((p) => p.id);

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((id) => deleteTalkingPhoto(apiKey, id))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === true) freed++;
      else failed++;
    }
    const processed = Math.min(i + concurrency, targets.length);
    const pct = ((processed / targets.length) * 100).toFixed(1);
    process.stdout.write(
      `\r[cleanup] progress: ${freed} freed, ${failed} failed, ` +
      `${processed}/${targets.length} (${pct}%)        `
    );
  }
  process.stdout.write("\n");

  const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[cleanup] done in ${elapsedSec}s: freed ${freed}, failed ${failed}`
  );
  if (failed > 0) {
    console.log(
      "[cleanup] some deletes failed — re-run the script to retry the remainders."
    );
  }
}

main().catch((err) => {
  console.error("[cleanup] fatal:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
