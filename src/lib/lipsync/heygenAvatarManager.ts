import {
  getAllCachedTalkingPhotoIds,
  removeCachedByTalkingPhotoId,
  type CachedAvatarRecord,
} from "@/lib/lipsync/heygenPhotoCache";

const HEYGEN_API_BASE = "https://api.heygen.com";
const LIST_PATH = "/v1/talking_photo.list";
const DELETE_PATH = "/v2/talking_photo"; // DELETE /v2/talking_photo/{id}
const REQUEST_TIMEOUT_MS = 30_000;

type ListedTalkingPhoto = {
  id: string;
  /** ms since epoch when HeyGen created the avatar, or null if unknown. */
  createdAtMs: number | null;
};

/**
 * Reads a `created_at` value from a HeyGen list entry. HeyGen has shipped it
 * both as a Unix-seconds number and a Unix-ms number across endpoints, so we
 * sniff the magnitude and normalize to ms.
 */
function coerceCreatedAtMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  // Anything below 1e12 is almost certainly seconds, not milliseconds.
  return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
}

function extractList(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Different HeyGen revisions place the array under .list or
    // .talking_photos; tolerate both rather than break when they switch.
    if (Array.isArray(obj.list)) return obj.list as Array<Record<string, unknown>>;
    if (Array.isArray(obj.talking_photos)) {
      return obj.talking_photos as Array<Record<string, unknown>>;
    }
    if (Array.isArray(obj.data)) return obj.data as Array<Record<string, unknown>>;
  }
  return [];
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lists every Photo Avatar stored in the HeyGen account. Returns [] on any
 * failure - the caller treats "empty list" as "no candidate to delete" and
 * falls through to the actionable quota error.
 */
export async function listTalkingPhotos(
  apiKey: string
): Promise<ListedTalkingPhoto[]> {
  try {
    const response = await fetchWithTimeout(`${HEYGEN_API_BASE}${LIST_PATH}`, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) {
      console.warn(
        `[heygen] talking_photo.list failed: ${response.status} ${response.statusText}`
      );
      return [];
    }
    const body = (await response.json()) as { code?: number; data?: unknown };
    const items = extractList(body.data);
    return items
      .map((item) => {
        const id =
          (typeof item.id === "string" && item.id) ||
          (typeof item.talking_photo_id === "string" && item.talking_photo_id) ||
          "";
        const createdAtMs =
          coerceCreatedAtMs(item.created_at) ?? coerceCreatedAtMs(item.createdAt);
        return { id, createdAtMs };
      })
      .filter((p) => p.id.length > 0);
  } catch (e) {
    console.warn(
      "[heygen] talking_photo.list error:",
      e instanceof Error ? e.message : String(e)
    );
    return [];
  }
}

/**
 * Deletes a single Photo Avatar by talking_photo_id. Returns true only when
 * HeyGen confirms the deletion (any non-2xx or transport error returns false).
 */
export async function deleteTalkingPhoto(
  apiKey: string,
  talkingPhotoId: string
): Promise<boolean> {
  if (!talkingPhotoId.trim()) return false;
  try {
    const url = `${HEYGEN_API_BASE}${DELETE_PATH}/${encodeURIComponent(
      talkingPhotoId
    )}`;
    const response = await fetchWithTimeout(url, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(
        `[heygen] DELETE talking_photo/${talkingPhotoId} failed: ` +
          `${response.status} ${response.statusText}. ${text.slice(0, 200)}`
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn(
      `[heygen] DELETE talking_photo/${talkingPhotoId} error:`,
      e instanceof Error ? e.message : String(e)
    );
    return false;
  }
}

async function deleteInParallelBatches(
  apiKey: string,
  ids: string[],
  jobId: string,
  concurrency: number,
  label: string
): Promise<number> {
  let freed = 0;
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((id) => deleteTalkingPhoto(apiKey, id))
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === true) freed++;
    }
    const processed = Math.min(i + concurrency, ids.length);
    // Log periodically so a multi-thousand-avatar cleanup shows visible
    // progress in the worker output instead of just hanging.
    if (processed % 200 === 0 || processed === ids.length) {
      console.log(
        `[heygen] jobId=${jobId} ${label}: ${freed}/${processed} freed ` +
          `(target ${ids.length})`
      );
    }
  }
  return freed;
}

export type FreeUpResult = {
  freedCount: number;
  orphansRemaining: number;
  source: "orphan" | "lru" | "none";
};

export type FreeUpOptions = {
  /** Max orphans to delete in a single call. Default 10000 — high enough to
   * clear historical accumulation from before the cache shipped. */
  maxOrphansToDelete?: number;
  /** Parallel deletes in flight at once. Default 10 — conservative against
   * HeyGen rate limits while still finishing thousands in a few minutes. */
  concurrency?: number;
};

/**
 * Frees space in the HeyGen Photo-Avatar quota. Strategy:
 *
 *   1. Bulk-delete ORPHANS — avatars HeyGen has but our cache does not know
 *      about. Almost always leftovers from runs before the cache shipped,
 *      so deletion costs us nothing (next use re-uploads + re-caches).
 *      Deleted oldest-first, in parallel batches, up to `maxOrphansToDelete`.
 *   2. If there are NO orphans, fall back to a single LRU eviction among
 *      cached avatars. We never bulk-delete cached entries — those are
 *      working assets and should only be sacrificed one-at-a-time when
 *      there is no safer option.
 *
 * Returns counts so the caller can decide whether to retry the upload or
 * point the user at the explicit cleanup script.
 */
export async function freeUpHeyGenSlot(
  apiKey: string,
  jobId: string,
  options?: FreeUpOptions
): Promise<FreeUpResult> {
  const maxOrphansToDelete = options?.maxOrphansToDelete ?? 10000;
  const concurrency = Math.max(1, Math.min(50, options?.concurrency ?? 10));

  const accountAvatars = await listTalkingPhotos(apiKey);
  if (accountAvatars.length === 0) {
    console.warn(
      `[heygen] jobId=${jobId} freeUpSlot: account has no listable avatars`
    );
    return { freedCount: 0, orphansRemaining: 0, source: "none" };
  }

  const cachedById = getAllCachedTalkingPhotoIds();
  const orphans = accountAvatars.filter((p) => !cachedById.has(p.id));
  const cached = accountAvatars.filter((p) => cachedById.has(p.id));

  console.log(
    `[heygen] jobId=${jobId} freeUpSlot: ${accountAvatars.length} avatar(s) ` +
      `in account (${orphans.length} orphan, ${cached.length} cached)`
  );

  // ---- Path 1: bulk-delete orphans ----
  if (orphans.length > 0) {
    // Sort oldest first. Orphans with no createdAt timestamp are treated as
    // ancient so they're picked first.
    const sorted = orphans.slice().sort(
      (a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0)
    );
    const targets = sorted.slice(0, maxOrphansToDelete);
    console.log(
      `[heygen] jobId=${jobId} freeUpSlot: bulk-deleting up to ` +
        `${targets.length} orphan(s) (concurrency=${concurrency})`
    );
    const freed = await deleteInParallelBatches(
      apiKey,
      targets.map((t) => t.id),
      jobId,
      concurrency,
      "freeUpSlot/orphans"
    );
    const remaining = orphans.length - freed;
    console.log(
      `[heygen] jobId=${jobId} freeUpSlot done: freed=${freed}, ` +
        `attempted=${targets.length}, orphansRemaining=${remaining}`
    );
    return { freedCount: freed, orphansRemaining: remaining, source: "orphan" };
  }

  // ---- Path 2: single LRU eviction among cached ----
  if (cached.length === 0) {
    return { freedCount: 0, orphansRemaining: 0, source: "none" };
  }
  const rankCached = cached
    .map((p) => {
      const entry = cachedById.get(p.id) as CachedAvatarRecord | undefined;
      const rankMs = entry?.lastUsedAt
        ? Date.parse(entry.lastUsedAt)
        : entry?.createdAt
          ? Date.parse(entry.createdAt)
          : 0;
      return { id: p.id, rankMs: Number.isFinite(rankMs) ? rankMs : 0 };
    })
    .sort((a, b) => a.rankMs - b.rankMs);
  const victim = rankCached[0]!;
  console.log(
    `[heygen] jobId=${jobId} freeUpSlot: no orphans; LRU-evicting cached ${victim.id}`
  );
  const ok = await deleteTalkingPhoto(apiKey, victim.id);
  if (!ok) {
    return { freedCount: 0, orphansRemaining: 0, source: "none" };
  }
  removeCachedByTalkingPhotoId(victim.id);
  console.log(`[heygen] jobId=${jobId} freeUpSlot: freed cached ${victim.id}`);
  return { freedCount: 1, orphansRemaining: 0, source: "lru" };
}
