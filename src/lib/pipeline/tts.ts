import type { Script, ShotList } from "@/lib/types";
import type { TTSResult, WordTiming } from "@/lib/types";
import { createSilenceWav, pcmToWav, SAMPLE_RATE } from "@/lib/tts/wav";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

type TTSProvider = "elevenlabs" | "playht";

interface Segment {
  text: string | null;
  durationSeconds: number;
}

function buildSegments(script: Script, shotList: ShotList): Segment[] {
  const shotById = new Map(shotList.shots.map((s) => [s.id, s]));
  const entries = [...script.entries].sort((a, b) => a.order - b.order);
  return entries.map((entry) => {
    const shot = shotById.get(entry.shotId);
    const durationSeconds = shot ? shot.durationSeconds : 0;
    return { text: entry.text, durationSeconds };
  });
}

async function synthesizeElevenLabsPcm(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<Buffer> {
  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=pcm_44100`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/pcm",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs TTS failed: ${response.status}. ${response.status === 401 ? "Check your API key." : body || ""}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const pcm = Buffer.from(arrayBuffer);
  return pcmToWav(pcm);
}

async function synthesizeElevenLabsMp3(
  text: string,
  apiKey: string,
  voiceId: string
): Promise<Buffer> {
  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `ElevenLabs TTS failed: ${response.status}. ${response.status === 401 ? "Check your API key." : body || ""}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function synthesizePlayHT(
  text: string,
  apiKey: string,
  voiceId: string,
  userId: string
): Promise<Buffer> {
  const response = await fetch("https://api.play.ht/api/v2/tts/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-User-ID": userId,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      voice: voiceId,
      voice_engine: "PlayHT2.0-turbo",
      output_format: "mp3",
      sample_rate: 44100,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PlayHT TTS failed: ${response.status}. ${response.status === 401 ? "Check your API key and user ID." : body || ""}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getWavDurationMs(wavBuffer: Buffer): number {
  if (wavBuffer.length < 44) return 0;
  const dataSize = wavBuffer.readUInt32LE(40);
  const numSamples = dataSize / 2;
  return (numSamples / SAMPLE_RATE) * 1000;
}

function getMp3DurationMsApprox(mp3Buffer: Buffer): number {
  const kbps = 128;
  const bytesPerSec = (kbps * 1000) / 8;
  return (mp3Buffer.length / bytesPerSec) * 1000;
}

function generatePreviewTTS(script: Script, shotList: ShotList): Promise<TTSResult> {
  const segments = buildSegments(script, shotList);
  const buffers: Buffer[] = [];
  let durationMs = 0;
  const wordTimings: WordTiming[] = [];

  for (const seg of segments) {
    const silence = createSilenceWav(seg.durationSeconds);
    buffers.push(silence);
    const segStartMs = durationMs;
    durationMs += seg.durationSeconds * 1000;
    const segEndMs = durationMs;

    if (seg.text && seg.text.trim() !== "") {
      const words = seg.text.trim().split(/\s+/).filter(Boolean);
      const n = words.length;
      if (n > 0) {
        const segDurationMs = segEndMs - segStartMs;
        const msPerWord = segDurationMs / n;
        for (let i = 0; i < n; i++) {
          const startMs = Math.round(segStartMs + i * msPerWord);
          const endMs = Math.round(segStartMs + (i + 1) * msPerWord);
          wordTimings.push({ word: words[i]!, startMs, endMs });
        }
      }
    }
  }

  const audioBuffer = Buffer.concat(buffers);
  return Promise.resolve({
    audioBuffer,
    audioFormat: "wav",
    durationMs: Math.round(durationMs),
    wordTimings: wordTimings.length > 0 ? wordTimings : undefined,
  });
}

export type GenerateTTSOptions = { usePreviewTTS?: boolean; voiceId?: string };

export async function generateTTS(
  script: Script,
  shotList: ShotList,
  options?: GenerateTTSOptions
): Promise<TTSResult> {
  if (options?.usePreviewTTS) {
    return generatePreviewTTS(script, shotList);
  }
  const provider = (process.env.TTS_PROVIDER ?? "elevenlabs") as TTSProvider;
  const voiceId =
    options?.voiceId != null && String(options.voiceId).trim() !== ""
      ? String(options.voiceId).trim()
      : (process.env.TTS_VOICE_ID ?? DEFAULT_VOICE_ID);

  if (provider === "elevenlabs") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("ELEVENLABS_API_KEY is not set. Add your key to .env.local");
    }
    const useMp3 = process.env.ELEVENLABS_USE_MP3 === "true" || process.env.ELEVENLABS_USE_MP3 === "1";
    return useMp3
      ? generateTTSElevenLabsMp3(script, shotList, apiKey, voiceId)
      : generateTTSElevenLabs(script, shotList, apiKey, voiceId);
  }

  if (provider === "playht") {
    const apiKey = process.env.PLAYHT_API_KEY;
    const userId = process.env.PLAYHT_USER_ID;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("PLAYHT_API_KEY is not set. Add your key to .env.local");
    }
    if (!userId || userId.trim() === "") {
      throw new Error("PLAYHT_USER_ID is not set. Add your PlayHT user ID to .env.local");
    }
    return generateTTSPlayHT(script, shotList, apiKey, userId, voiceId);
  }

  throw new Error(`Unknown TTS_PROVIDER: ${provider}. Use "elevenlabs" or "playht".`);
}

async function generateTTSElevenLabs(
  script: Script,
  shotList: ShotList,
  apiKey: string,
  voiceId: string
): Promise<TTSResult> {
  const segments = buildSegments(script, shotList);
  const buffers: Buffer[] = [];
  const segmentDurationsMs: number[] = [];
  let durationMs = 0;

  for (const seg of segments) {
    if (seg.text === null || seg.text.trim() === "") {
      const silence = createSilenceWav(seg.durationSeconds);
      buffers.push(silence);
      const segMs = seg.durationSeconds * 1000;
      durationMs += segMs;
      segmentDurationsMs.push(segMs);
    } else {
      const wav = await synthesizeElevenLabsPcm(seg.text.trim(), apiKey, voiceId);
      buffers.push(wav);
      const segMs = getWavDurationMs(wav);
      durationMs += segMs;
      segmentDurationsMs.push(segMs);
    }
  }

  const audioBuffer = Buffer.concat(buffers);
  return {
    audioBuffer,
    audioFormat: "wav",
    durationMs: Math.round(durationMs),
    segmentDurationsMs,
  };
}

async function generateTTSElevenLabsMp3(
  script: Script,
  shotList: ShotList,
  apiKey: string,
  voiceId: string
): Promise<TTSResult> {
  const segments = buildSegments(script, shotList);
  const buffers: Buffer[] = [];
  const segmentDurationsMs: number[] = [];
  let durationMs = 0;

  for (const seg of segments) {
    if (seg.text === null || seg.text.trim() === "") {
      segmentDurationsMs.push(seg.durationSeconds * 1000);
      continue;
    }
    const mp3 = await synthesizeElevenLabsMp3(seg.text.trim(), apiKey, voiceId);
    buffers.push(mp3);
    const segMs = getMp3DurationMsApprox(mp3);
    durationMs += segMs;
    segmentDurationsMs.push(segMs);
  }

  const audioBuffer = buffers.length > 0 ? Buffer.concat(buffers) : Buffer.alloc(0);
  return {
    audioBuffer,
    audioFormat: "mp3",
    durationMs: Math.round(durationMs),
    segmentDurationsMs,
  };
}

async function generateTTSPlayHT(
  script: Script,
  shotList: ShotList,
  apiKey: string,
  userId: string,
  voiceId: string
): Promise<TTSResult> {
  const segments = buildSegments(script, shotList);
  const buffers: Buffer[] = [];
  const segmentDurationsMs: number[] = [];
  let durationMs = 0;

  for (const seg of segments) {
    if (seg.text === null || seg.text.trim() === "") {
      segmentDurationsMs.push(seg.durationSeconds * 1000);
      continue;
    }
    const mp3 = await synthesizePlayHT(seg.text.trim(), apiKey, voiceId, userId);
    buffers.push(mp3);
    const segMs = getMp3DurationMsApprox(mp3);
    durationMs += segMs;
    segmentDurationsMs.push(segMs);
  }

  const audioBuffer = buffers.length > 0 ? Buffer.concat(buffers) : Buffer.alloc(0);
  return {
    audioBuffer,
    audioFormat: "mp3",
    durationMs: Math.round(durationMs),
    segmentDurationsMs,
  };
}
