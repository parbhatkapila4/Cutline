import { NextResponse } from "next/server";
import { pingRedis } from "@/lib/health/readiness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ComponentStatus = "operational" | "degraded" | "outage" | "not_configured";

type Component = {
  id: string;
  name: string;
  description: string;
  status: ComponentStatus;
  detail?: string;
  latencyMs?: number;
};

async function checkRedis(): Promise<Component> {
  if (!process.env.REDIS_URL?.trim()) {
    return {
      id: "redis",
      name: "Queue (Redis)",
      description: "BullMQ job queue + rate limiting",
      status: "not_configured",
      detail: "REDIS_URL not set",
    };
  }
  const start = Date.now();
  const result = await pingRedis();
  const latencyMs = Date.now() - start;
  return {
    id: "redis",
    name: "Queue (Redis)",
    description: "BullMQ job queue + rate limiting",
    status: result.ok ? "operational" : "outage",
    detail: result.ok ? "PONG" : (result.error ?? "unreachable"),
    latencyMs,
  };
}

function configCheck(envKey: string, name: string, description: string, id: string): Component {
  const configured = !!process.env[envKey]?.trim();
  return {
    id,
    name,
    description,
    status: configured ? "operational" : "not_configured",
    detail: configured ? "API key configured" : `${envKey} not set`,
  };
}

function ttsCheck(): Component {
  const provider = process.env.TTS_PROVIDER?.trim() || "elevenlabs";
  if (provider === "playht") {
    const configured = !!(process.env.PLAYHT_API_KEY?.trim() && process.env.PLAYHT_USER_ID?.trim());
    return {
      id: "tts",
      name: "Text-to-speech (PlayHT)",
      description: "Voiceover generation for every shot",
      status: configured ? "operational" : "not_configured",
      detail: configured ? "PlayHT keys configured" : "PLAYHT_API_KEY or PLAYHT_USER_ID missing",
    };
  }
  const configured = !!process.env.ELEVENLABS_API_KEY?.trim();
  return {
    id: "tts",
    name: "Text-to-speech (ElevenLabs)",
    description: "Voiceover generation for every shot",
    status: configured ? "operational" : "not_configured",
    detail: configured ? "ElevenLabs key configured" : "ELEVENLABS_API_KEY missing",
  };
}

function imagesCheck(): Component {
  const sources: string[] = [];
  if (process.env.UNSPLASH_ACCESS_KEY?.trim()) sources.push("Unsplash");
  if (process.env.PEXELS_API_KEY?.trim()) sources.push("Pexels");
  if (process.env.OPENAI_API_KEY?.trim()) sources.push("DALL·E 3");
  return {
    id: "images",
    name: "Image sourcing",
    description: "Stock photos and AI image generation per shot",
    status:
      sources.length === 0
        ? "not_configured"
        : sources.length < 2
          ? "degraded"
          : "operational",
    detail:
      sources.length === 0
        ? "No image providers configured"
        : `Active providers: ${sources.join(", ")}`,
  };
}

function databaseCheck(): Component {
  const configured = !!process.env.DATABASE_URL?.trim();
  return {
    id: "database",
    name: "Database (Postgres)",
    description: "User accounts, anonymous sessions, job ownership",
    status: configured ? "operational" : "not_configured",
    detail: configured ? "DATABASE_URL configured" : "DATABASE_URL not set (running stateless)",
  };
}

export async function GET() {
  const components: Component[] = [
    await checkRedis(),
    databaseCheck(),
    configCheck("OPENROUTER_API_KEY", "Language models (OpenRouter)", "Script, narrative, intent, and image-prompt generation", "openrouter"),
    ttsCheck(),
    imagesCheck(),
  ];

  const overall: ComponentStatus = components.some((c) => c.status === "outage")
    ? "outage"
    : components.some((c) => c.status === "degraded")
      ? "degraded"
      : components.every((c) => c.status === "not_configured")
        ? "not_configured"
        : "operational";

  return NextResponse.json(
    {
      status: overall,
      generatedAt: new Date().toISOString(),
      components,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
