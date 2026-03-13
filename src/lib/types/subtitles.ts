export interface SubtitleChunk {
  text: string;
  startMs: number;
  endMs: number;
  shotId: string;
}

export interface SubtitleTrack {
  chunks: SubtitleChunk[];
}
