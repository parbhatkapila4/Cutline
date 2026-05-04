import { betterAuth } from "better-auth";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool =
  connectionString != null && connectionString.trim() !== ""
    ? new Pool({
      connectionString,
      max: Math.min(25, Math.max(5, Number(process.env.PG_POOL_MAX ?? "12") || 12)),
      idleTimeoutMillis: 30_000,
      /** Neon / remote Postgres can exceed 10s under load; failing fast is handled in getSessionSafe. */
      connectionTimeoutMillis: Math.min(
        60_000,
        Math.max(5000, Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? "15000") || 15_000)
      ),
      allowExitOnIdle: true,
      keepAlive: true,
    })
    : undefined;

pool?.on("error", (err: Error & { code?: string }) => {
  const code = err.code ?? "UNKNOWN";
  const transient = code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EPIPE";
  if (transient) {
    if (process.env.DB_DEBUG === "true") {
      console.warn("[auth-db] transient pg pool connection error:", code);
    }
    return;
  }
  console.error("[auth-db] pg pool error:", code, err.message);
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ],
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
      : {}),
  },
});
