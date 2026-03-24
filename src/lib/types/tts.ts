export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  audioFormat: "mp3" | "wav";
  durationMs: number;
  wordTimings?: WordTiming[];
  segmentDurationsMs?: number[];
}
