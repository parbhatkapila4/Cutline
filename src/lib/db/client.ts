import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim() || undefined;
}

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

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
