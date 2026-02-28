/**
 * Neon Postgres client. Uses DATABASE_URL from env.
 * Safe to call getSql() even when DATABASE_URL is unset; throws when used for queries.
 */

import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

/**
 * Get the Neon SQL client. Throws if DATABASE_URL is not set.
 */
export function getSql(): ReturnType<typeof neon> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sqlInstance) {
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

/**
 * True if database is configured and can be used.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
