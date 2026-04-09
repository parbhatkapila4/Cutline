export function getCaptionsRenderOption(
  captions: "on" | "off" | undefined,
  subtitleTrackRefined: {
    chunks: Array<{ text: string; startMs: number; endMs: number; shotId: string }>;
  }
): {
  showCaptions: boolean;
  subtitleTrack: {
    chunks: Array<{ text: string; startMs: number; endMs: number; shotId: string }>;
  };
} {
  const showCaptions = captions !== "off";
  return {
    showCaptions,
    subtitleTrack: showCaptions ? subtitleTrackRefined : { chunks: [] },
  };
}
