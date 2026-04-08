import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

type SubtitleChunk = {
  text: string;
  startMs: number;
  endMs: number;
  shotId: string;
};

type SubtitleOverlayProps = {
  chunks: SubtitleChunk[];
  shotId: string;
};
export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  chunks,
  shotId,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const shotChunks = chunks.filter((c) => c.shotId === shotId);
  const visible = shotChunks.find(
    (c) => currentMs >= c.startMs && currentMs < c.endMs
  );

  if (!visible) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: "20%",
      }}
    >
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 26,
          fontWeight: 500,
          color: "white",
          textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          textAlign: "center",
          maxWidth: "85%",
        }}
      >
        {visible.text}
      </div>
    </AbsoluteFill>
  );
};
