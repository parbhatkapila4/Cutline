const store = new Map<string, string>();

async function incrby(key: string, by: number): Promise<number> {
  const next = Number.parseInt(store.get(key) ?? "0", 10) + by;
  store.set(key, String(next));
  return next;
}

export const fakeRedis = {
  store,
  async get(key: string): Promise<string | null> {
    return store.get(key) ?? null;
  },
  async set(key: string, value: string, ...options: unknown[]): Promise<"OK" | null> {
    if (options.includes("NX") && store.has(key)) return null;
    store.set(key, String(value));
    return "OK";
  },
  incrby,
  async incr(key: string): Promise<number> {
    return incrby(key, 1);
  },
  async expire(): Promise<number> {
    return 1;
  },
};

export const managedRedisMock = {
  createManagedRedis: () => fakeRedis,
  FAIL_FAST_REDIS_OPTIONS: {},
};
