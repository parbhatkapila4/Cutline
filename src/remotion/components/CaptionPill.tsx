import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import {
  CAPTION_BACKGROUND_OPACITY,
  CAPTION_FONT_WEIGHT,
  layoutCaption,
} from "../captionLayout";

let measureContext: CanvasRenderingContext2D | null | undefined;

function measureText(text: string, fontSizePx: number, fontFamily: string): number {
  if (measureContext === undefined) {
    try {
      measureContext = document.createElement("canvas").getContext("2d");
    } catch {
      measureContext = null;
    }
  }
  if (measureContext) {
    measureContext.font = `${CAPTION_FONT_WEIGHT} ${fontSizePx}px ${fontFamily}`;
    const width = measureContext.measureText(text).width;
    if (Number.isFinite(width) && width > 0) return width;
  }
  return text.length * fontSizePx * 0.6;
}

export const CaptionPill: React.FC<{
  text: string;
  fontFamily: string;
  color: string;
}> = ({ text, fontFamily, color }) => {
  const { width, height } = useVideoConfig();
  const layout = useMemo(
    () =>
      layoutCaption(text, { width, height }, (t, size) => measureText(t, size, fontFamily)),
    [text, width, height, fontFamily]
  );

  if (layout.lines.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: layout.bottomPx,
        display: "flex",
        justifyContent: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: `rgba(0, 0, 0, ${CAPTION_BACKGROUND_OPACITY})`,
          borderRadius: layout.radiusPx,
          padding: `${layout.paddingYPx}px ${layout.paddingXPx}px`,
        }}
      >
        {layout.lines.map((line, index) => (
          <div
            key={index}
            style={{
              fontFamily,
              fontSize: layout.fontSizePx,
              fontWeight: CAPTION_FONT_WEIGHT,
              lineHeight: `${layout.lineHeightPx}px`,
              color,
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};
