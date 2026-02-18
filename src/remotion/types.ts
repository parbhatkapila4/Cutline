
export type CUTLINECompositionProps = {
  script: { entries: Array<{ shotId: string; text: string | null; order: number }> };
  shotList: {
    shots: Array<{
      id: string;
      beatId: string;
      durationSeconds: number;
      purpose: string;
      motionType: string;
      emotionalIntent: string;
      textDensity: number;
      order: number;
    }>;
    totalDurationSeconds: number;
  };
  subtitleTrack: {
    chunks: Array<{ text: string; startMs: number; endMs: number; shotId: string }>;
  };
  showCaptions?: boolean;
  motionSpec: {
    entries: Array<{
      shotId: string;
      motionType: string;
      durationSeconds: number;
      params: Record<string, unknown>;
      order: number;
    }>;
  };
  visualSpec: {
    entries: Array<{
      shotId: string;
      backgroundType: string;
      params: Record<string, unknown>;
      order: number;
    }>;
  };
  imageSpec: {
    entries: Array<{
      shotId: string;
      imageUrl: string;
      source: string;
      fallbackUsed: boolean;
    }>;
  };
  logoUrl?: string;
  logoPlacement?: "outro" | "watermark" | "hero";
  audioBase64: string | null;
  audioFormat?: "wav" | "mp3";
  width?: number;
  height?: number;
};
