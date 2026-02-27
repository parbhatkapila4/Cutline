/**
 * Anonymous session service.
 * Persists anon_sessions and tracks generation_count.
 * TODO: Inject DB connection when Neon is configured; all persistence is no-op until then.
 */

import type { AnonSession } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// TODO: Replace with actual Neon/Postgres client when DATABASE_URL is set.
// Example: import { neon } from "@neondatabase/serverless";
// const sql = neon(process.env.DATABASE_URL!);
// ---------------------------------------------------------------------------

/**
 * Get an existing anon session by id.
 * TODO: SELECT * FROM anon_sessions WHERE id = $1
 */
export async function getAnonSessionById(sessionId: string): Promise<AnonSession | null> {
  // TODO: const row = await sql`SELECT * FROM anon_sessions WHERE id = ${sessionId} LIMIT 1`;
  // TODO: return row[0] ? mapRowToAnonSession(row[0]) : null;
  void sessionId;
  return null;
}

/**
 * Create a new anon session and return it.
 * TODO: INSERT INTO anon_sessions (id, created_at, generation_count) VALUES (gen_random_uuid(), now(), 0) RETURNING *
 */
export async function createAnonSession(): Promise<AnonSession> {
  // TODO: const [row] = await sql`INSERT INTO anon_sessions (id, created_at, generation_count) VALUES (gen_random_uuid(), now(), 0) RETURNING *`;
  // TODO: return mapRowToAnonSession(row);
  const id = crypto.randomUUID();
  return {
    id,
    created_at: new Date(),
    generation_count: 0,
  };
}

/**
 * Increment generation_count for the given anon session. Idempotent per job.
 * Call after successfully creating a video_job for this session.
 * TODO: UPDATE anon_sessions SET generation_count = generation_count + 1 WHERE id = $1 RETURNING *
 */
export async function incrementAnonGenerationCount(sessionId: string): Promise<boolean> {
  // TODO: const [row] = await sql`UPDATE anon_sessions SET generation_count = generation_count + 1 WHERE id = ${sessionId} RETURNING id`;
  // TODO: return row != null;
  void sessionId;
  return true;
}

function mapRowToAnonSession(_row: Record<string, unknown>): AnonSession {
  // TODO: implement when DB is connected
  throw new Error("DB not connected");
}
