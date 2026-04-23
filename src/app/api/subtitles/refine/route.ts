import { NextResponse } from "next/server";
import { refineSubtitles } from "@/lib/pipeline/subtitle-refinement";
import type { Script, ShotList, SubtitleTrack, WordTiming } from "@/lib/types";

function isSubtitleTrack(v: unknown): v is SubtitleTrack {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.chunks);
}

function isWordTiming(v: unknown): v is WordTiming {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.word === "string" &&
    typeof o.startMs === "number" &&
    typeof o.endMs === "number"
  );
}

function isScript(v: unknown): v is Script {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.entries);
}

function isShotList(v: unknown): v is ShotList {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return Array.isArray(o.shots);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON body. Send { subtitleTrack, wordTimings?, script, shotList }.",
      },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { error: "Body must be an object with subtitleTrack, script, shotList." },
      { status: 400 }
    );
  }

  const { subtitleTrack, wordTimings, script, shotList } = body as {
    subtitleTrack?: unknown;
    wordTimings?: unknown;
    script?: unknown;
    shotList?: unknown;
  };

  if (!isSubtitleTrack(subtitleTrack)) {
    return NextResponse.json(
      { error: "Missing or invalid subtitleTrack (needs chunks array)." },
      { status: 400 }
    );
  }
  if (!isScript(script)) {
    return NextResponse.json(
      { error: "Missing or invalid script (needs entries array)." },
      { status: 400 }
    );
  }
  if (!isShotList(shotList)) {
    return NextResponse.json(
      { error: "Missing or invalid shotList (needs shots array)." },
      { status: 400 }
    );
  }

  const validWordTimings: WordTiming[] | undefined =
    wordTimings !== undefined && Array.isArray(wordTimings)
      ? wordTimings.every(isWordTiming)
        ? (wordTimings as WordTiming[])
        : undefined
      : undefined;

  const refined = refineSubtitles(
    subtitleTrack,
    validWordTimings,
    script,
    shotList
  );
  return NextResponse.json(refined);
}
