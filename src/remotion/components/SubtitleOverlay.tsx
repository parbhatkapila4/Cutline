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
  const { fps, height } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const shotChunks = chunks.filter((c) => c.shotId === shotId);
  const visible = shotChunks.find(
    (c) => currentMs >= c.startMs && currentMs < c.endMs
  );

  if (!visible) return null;
  const fontSize = Math.max(28, Math.round(height * 0.045));
  const paddingBottom = Math.round(height * 0.1);
  const strokeWidth = Math.max(2, Math.round(height * 0.0035));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom,
      }}
    >
      <div
        style={{
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          fontSize,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          maxWidth: "86%",
          lineHeight: 1.25,
          letterSpacing: "0.005em",
          WebkitTextStroke: `${strokeWidth}px rgba(0, 0, 0, 0.9)`,
          paintOrder: "stroke fill",
          textShadow:
            "0 2px 6px rgba(0, 0, 0, 0.85), 0 0 12px rgba(0, 0, 0, 0.55)",
        }}
      >
        {visible.text}
      </div>
    </AbsoluteFill>
  );
};
