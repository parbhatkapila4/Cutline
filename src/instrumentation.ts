import { validateConfig } from "@/lib/config/validate";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    validateConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[config] Startup validation failed:", msg);
    throw e;
  }
}
