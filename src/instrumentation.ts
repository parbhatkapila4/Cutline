import { validateAuthConfig, validateConfig } from "@/lib/config/validate";
import { ensureVertexCredentials } from "@/lib/veo/credentials";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    validateConfig();
    validateAuthConfig();
    ensureVertexCredentials();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[config] Startup validation failed:", msg);
    throw e;
  }
}
