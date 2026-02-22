export const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const store = new Map<
  string,
  { jobId: string; status: string; responseBody: object; createdAt: number }
>();

const keyLocks = new Map<string, Promise<void>>();

function getRetentionMs(): number {
  return getIdempotencyRetentionHours() * 3600 * 1000;
}

export function getIdempotencyRetentionHours(): number {
  const raw = process.env.IDEMPOTENCY_RETENTION_HOURS;
  if (raw == null || raw === "") return 24;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 24;
  return Math.min(168, n);
}

export function setIdempotencyResult(
  key: string,
  data: { jobId: string; status: string; responseBody: object }
): void {
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) return;
  cleanExpiredIdempotencyKeys();
  store.set(key, {
    ...data,
    createdAt: Date.now(),
  });
}

export function getIdempotencyResult(key: string): {
  jobId: string;
  status: string;
  responseBody: object;
} | null {
  const entry = store.get(key);
  if (!entry) return null;
  const retentionMs = getRetentionMs();
  if (Date.now() - entry.createdAt > retentionMs) {
    store.delete(key);
    return null;
  }
  return {
    jobId: entry.jobId,
    status: entry.status,
    responseBody: entry.responseBody,
  };
}

export function cleanExpiredIdempotencyKeys(): void {
  const retentionMs = getRetentionMs();
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.createdAt > retentionMs) store.delete(key);
  }
}

export async function withIdempotencyLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  while (keyLocks.has(key)) {
    await keyLocks.get(key);
  }
  const promise = fn().finally(() => {
    keyLocks.delete(key);
  });
  keyLocks.set(key, promise as Promise<void>);
  return promise;
}
