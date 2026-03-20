import type { AnonSession } from "@/lib/db/types";
import { getSql } from "@/lib/db/client";

function mapRow(row: { id: string; created_at: Date; generation_count: number }): AnonSession {
  return {
    id: row.id,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    generation_count: Number(row.generation_count) ?? 0,
  };
}

export async function getAnonSessionById(sessionId: string): Promise<AnonSession | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, created_at, generation_count
    FROM anon_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `;
  const row = (rows as unknown as Record<string, unknown>[])[0];
  if (!row || typeof row !== "object") return null;
  return mapRow(row as { id: string; created_at: Date; generation_count: number });
}

export async function createAnonSession(): Promise<AnonSession> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO anon_sessions (id, created_at, generation_count)
    VALUES (gen_random_uuid(), now(), 0)
    RETURNING id, created_at, generation_count
  `;
  const row = (rows as unknown as Record<string, unknown>[])[0];
  if (!row || typeof row !== "object") {
    throw new Error("Failed to create anon session");
  }
  return mapRow(row as { id: string; created_at: Date; generation_count: number });
}

export async function incrementAnonGenerationCount(sessionId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE anon_sessions
    SET generation_count = generation_count + 1
    WHERE id = ${sessionId}
    RETURNING id
  `;
  return Array.isArray(rows) && rows.length > 0;
}
