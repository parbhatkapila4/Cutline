import type { Queue } from "bullmq";
import type Redis from "ioredis";
import { createRedisConnection, getVideoQueueName } from "./videoQueue";

export function workerHeartbeatKey(queueName: string): string {
  return "cutline:worker:heartbeat:" + queueName;
}
const HEARTBEAT_TTL_SEC = 180;
const DEFAULT_INTERVAL_MS = 20_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatRedis: Redis | null = null;

export function startWorkerHeartbeat(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (heartbeatTimer) return;
  heartbeatRedis = createRedisConnection();
  const beat = () => {
    heartbeatRedis
      ?.set(workerHeartbeatKey(getVideoQueueName()), String(Date.now()), "EX", HEARTBEAT_TTL_SEC)
      .catch(() => {
      });
  };
  beat();
  heartbeatTimer = setInterval(beat, intervalMs);
  if (typeof heartbeatTimer.unref === "function") heartbeatTimer.unref();
}

export async function stopWorkerHeartbeat(): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatRedis) {
    await heartbeatRedis.quit().catch(() => { });
    heartbeatRedis = null;
  }
}

export async function isWorkerAlive(queue: Queue): Promise<boolean> {
  try {
    const client = await queue.client;
    const v = await client.get(workerHeartbeatKey(queue.name));
    return v != null;
  } catch {
    return true;
  }
}
