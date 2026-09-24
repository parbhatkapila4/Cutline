import { validateAuthConfig, validateConfig } from "@/lib/config/validate";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      validateConfig();
      validateAuthConfig();
      const { ensureVertexCredentials } = await import("@/lib/veo/credentials");
      ensureVertexCredentials();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[config] Startup validation failed:", msg);
      throw e;
    }
  }
}
