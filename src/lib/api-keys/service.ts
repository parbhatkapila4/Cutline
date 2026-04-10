import { createHash, randomBytes } from "crypto";
import { getSql, isDatabaseConfigured } from "@/lib/db";

const PREFIX_LEN = 16;

function hashKey(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function generateApiKeyPair(): { fullKey: string; prefix: string; hash: string } {
  const fullKey = "clk_" + randomBytes(24).toString("hex");
  const prefix = fullKey.slice(0, PREFIX_LEN);
  return { fullKey, prefix, hash: hashKey(fullKey) };
}

export async function insertApiKey(
  userId: string,
  label?: string
): Promise<{ id: string; fullKey: string; prefix: string }> {
  const sql = getSql();
  const { fullKey, prefix, hash } = generateApiKeyPair();
  const rows = await sql`
    INSERT INTO api_keys (user_id, key_prefix, key_hash, label)
    VALUES (${userId}, ${prefix}, ${hash}, ${label ?? null})
    RETURNING id
  `;
  const id = (rows as { id: string }[])[0]?.id;
  if (!id) throw new Error("Failed to create API key");
  return { id, fullKey, prefix };
}

export async function validateApiKeyAndGetUserId(
  headerValue: string | null
): Promise<{ userId: string } | null> {
  if (!isDatabaseConfigured()) return null;
  const raw = headerValue?.trim();
  if (!raw || !raw.startsWith("clk_")) return null;
  const prefix = raw.slice(0, PREFIX_LEN);
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, key_hash FROM api_keys WHERE key_prefix = ${prefix}
  `;
  const row = (rows as { id: string; user_id: string; key_hash: string }[])[0];
  if (!row) return null;
  if (hashKey(raw) !== row.key_hash) return null;
  await sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${row.id}`;
  return { userId: row.user_id };
}
