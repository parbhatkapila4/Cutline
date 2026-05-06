import React, { useMemo } from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface CaptionPhrase {
  text: string;
  startTime: number;
  duration: number;
  _startFrame?: number;
  _endFrame?: number;
}

interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  strokeColor: string;
  strokeWidth: number;
  alignment: "left" | "center" | "right";
  verticalPosition: "top" | "middle" | "bottom";
  yOffset: number;
  maxWordsPerPhrase?: number;
  styleType?:
  | "clean"
  | "pop"
  | "native"
  | "highlight"
  | "white-bg"
  | "black-bg"
  | "red-bg"
  | "outline"
  | "plain-white";
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  boxDecorationBreak?: boolean;
}

interface CaptionPosition {
  x: number;
  y: number;
}

interface TextLayer {
  text_content: string;
  position_x: number;
  position_y: number;
  start_time: number;
  duration: number;
  style_config: CaptionStyle;
  isHook?: boolean;
}

export interface CaptionedVideoProps {
  videoUrl?: string;
  captions?: CaptionPhrase[];
  captionStyle?: CaptionStyle | null;
  captionPosition?: CaptionPosition | null;
  textLayers?: TextLayer[];
  captionOnly?: boolean;
}

const getFontFamily = (family: string = "TikTok Sans"): string => {
  return "TikTok Sans, sans-serif";
};

const getVerticalPosition = (style: CaptionStyle): string => {
  const yOffset = style.yOffset || 0;
  switch (style.verticalPosition) {
    case "top":
      return `calc(15% + ${yOffset}px)`;
    case "bottom":
      return `calc(80% + ${yOffset}px)`;
    case "middle":
    default:
      return `calc(50% + ${yOffset}px)`;
  }
};

interface LineBox {
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  text: string;
}

const TIKTOK_LAYOUT = {
  paddingH: 4,
  paddingTop: 5,
  paddingBottom: 10,
  cornerRadius: 25,
  jointRadius: 18,
  consistentPaddingH: { single: 30, multi: 22 },
  extraTopPadding: { single: 10, multi: 4 },
  extraBottomPadding: { single: 10, multi: 5 },
} as const;

function buildTikTokSvgPath(
  boxes: LineBox[],
  cornerRadius: number,
  jointRadius: number = 20
): string {
  if (boxes.length === 0) return "";

  const b: LineBox[] = boxes.map((box) => ({ ...box }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < b.length - 1; i++) {
      const a = b[i]!;
      const n = b[i + 1]!;
      const aRight = a.boxX + a.boxWidth;
      const nRight = n.boxX + n.boxWidth;
      const diffLeft = Math.abs(a.boxX - n.boxX);
      const diffRight = Math.abs(aRight - nRight);

      if (diffLeft < jointRadius || diffRight < jointRadius) {
        const mergedLeft = Math.min(a.boxX, n.boxX);
        const mergedRight = Math.max(aRight, nRight);
        const mergedWidth = mergedRight - mergedLeft;

        if (a.boxX !== mergedLeft || a.boxWidth !== mergedWidth) {
          a.boxX = mergedLeft;
          a.boxWidth = mergedWidth;
          changed = true;
        }
        if (n.boxX !== mergedLeft || n.boxWidth !== mergedWidth) {
          n.boxX = mergedLeft;
          n.boxWidth = mergedWidth;
          changed = true;
        }
      }
    }
  }

  const r = cornerRadius;
  const first = b[0]!;
  const last = b[b.length - 1]!;

  let svgPath = `M ${first.boxX + r} ${first.boxY}`;
  svgPath += ` L ${first.boxX + first.boxWidth - r} ${first.boxY}`;
  svgPath += ` Q ${first.boxX + first.boxWidth} ${first.boxY} ${first.boxX + first.boxWidth} ${first.boxY + r}`;

  for (let i = 0; i < b.length; i++) {
    const curr = b[i]!;
    const next = b[i + 1];

    if (next) {
      const jointY = curr.boxY + curr.boxHeight;
      const currRight = curr.boxX + curr.boxWidth;
      const nextRight = next.boxX + next.boxWidth;
      const widthDiff = Math.abs(currRight - nextRight);
      const cr = Math.min(widthDiff / 2, jointRadius);

      if (widthDiff < 2) {
        svgPath += ` L ${currRight} ${jointY}`;
      } else if (nextRight > currRight) {
        svgPath += ` L ${currRight} ${jointY - cr}`;
        svgPath += ` Q ${currRight} ${jointY} ${currRight + cr} ${jointY}`;
        svgPath += ` L ${nextRight - cr} ${jointY}`;
        svgPath += ` Q ${nextRight} ${jointY} ${nextRight} ${jointY + cr}`;
      } else {
        svgPath += ` L ${currRight} ${jointY - cr}`;
        svgPath += ` Q ${currRight} ${jointY} ${currRight - cr} ${jointY}`;
        svgPath += ` L ${nextRight + cr} ${jointY}`;
        svgPath += ` Q ${nextRight} ${jointY} ${nextRight} ${jointY + cr}`;
      }
    } else {
      svgPath += ` L ${curr.boxX + curr.boxWidth} ${curr.boxY + curr.boxHeight - r}`;
      svgPath += ` Q ${curr.boxX + curr.boxWidth} ${curr.boxY + curr.boxHeight} ${curr.boxX + curr.boxWidth - r} ${curr.boxY + curr.boxHeight}`;
    }
  }

  svgPath += ` L ${last.boxX + r} ${last.boxY + last.boxHeight}`;
  svgPath += ` Q ${last.boxX} ${last.boxY + last.boxHeight} ${last.boxX} ${last.boxY + last.boxHeight - r}`;

  for (let i = b.length - 1; i >= 0; i--) {
    const curr = b[i]!;
    const prev = b[i - 1];

    if (prev) {
      const jointY = curr.boxY;
      const currLeft = curr.boxX;
      const prevLeft = prev.boxX;
      const widthDiff = Math.abs(currLeft - prevLeft);
      const cr = Math.min(widthDiff / 2, jointRadius);

      if (widthDiff < 2) {
        svgPath += ` L ${currLeft} ${jointY}`;
      } else if (prevLeft < currLeft) {
        svgPath += ` L ${currLeft} ${jointY + cr}`;
        svgPath += ` Q ${currLeft} ${jointY} ${currLeft - cr} ${jointY}`;
        svgPath += ` L ${prevLeft + cr} ${jointY}`;
        svgPath += ` Q ${prevLeft} ${jointY} ${prevLeft} ${jointY - cr}`;
      } else {
        svgPath += ` L ${currLeft} ${jointY + cr}`;
        svgPath += ` Q ${currLeft} ${jointY} ${currLeft + cr} ${jointY}`;
        svgPath += ` L ${prevLeft - cr} ${jointY}`;
        svgPath += ` Q ${prevLeft} ${jointY} ${prevLeft} ${jointY - cr}`;
      }
    } else {
      svgPath += ` L ${curr.boxX} ${curr.boxY + r}`;
      svgPath += ` Q ${curr.boxX} ${curr.boxY} ${curr.boxX + r} ${curr.boxY}`;
    }
  }

  svgPath += " Z";
  return svgPath;
}

interface TextLayoutResult {
  svgPath: string;
  hasBackground: boolean;
  backgroundColor: string;
  textLines: Array<{ text: string; x: number; y: number }>;
  fontSize: number;
  fontColor: string;
  hasStroke: boolean;
  strokeColor: string;
  strokeWidth: number;
}

function calculateTikTokTextLayout(
  text: string,
  style: CaptionStyle,
  position: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number,
  isTextLayer: boolean = false
): TextLayoutResult {
  const fontSize = style.fontSize || 28;
  const hasBackground = !!style.backgroundColor;
  const hasStroke = (style.strokeWidth || 0) > 0;

  const scale = canvasWidth / 1080;
  const L = TIKTOK_LAYOUT;
  const paddingH = L.paddingH * scale;
  const paddingTop = L.paddingTop * scale;
  const paddingBottom = L.paddingBottom * scale;
  const cornerRadius = L.cornerRadius * scale;

  const maxWidth = canvasWidth * 0.85;
  const lines: { text: string; width: number }[] = [];

  const charWidthRatio = 0.55;
  let measureCtx: CanvasRenderingContext2D | null = null;
  try {
    const measureCanvas = document.createElement("canvas");
    measureCtx = measureCanvas.getContext("2d");
    if (measureCtx) {
      measureCtx.font = `500 ${fontSize}px TikTok Sans, sans-serif`;
    }
  } catch {
  }

  const measureText = (text: string): number => {
    if (measureCtx) {
      return measureCtx.measureText(text).width;
    }
    return text.length * fontSize * charWidthRatio;
  };

  const balancedWrap = (words: string[]) => {
    let greedyCount = 1;
    let currentLine = "";
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureText(testLine) > maxWidth && currentLine) {
        greedyCount++;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    const numLines = greedyCount;

    const lineWidthFor = (from: number, to: number): number => {
      let t = words[from]!;
      for (let k = from + 1; k <= to; k++) {
        t += " " + words[k];
      }
      return measureText(t);
    };

    const n = words.length;
    const INF = 1e18;
    const dp: number[][] = Array.from({ length: n + 1 }, () =>
      Array(numLines + 1).fill(INF)
    );
    const splitPt: number[][] = Array.from({ length: n + 1 }, () =>
      Array(numLines + 1).fill(0)
    );
    dp[0]![0]! = 0;

    for (let j = 1; j <= numLines; j++) {
      for (let i = j; i <= n; i++) {
        for (let k = j - 1; k < i; k++) {
          const w = lineWidthFor(k, i - 1);
          if (w <= maxWidth) {
            const cost = dp[k]![j - 1]! + w * w;
            if (cost < dp[i]![j]!) {
              dp[i]![j]! = cost;
              splitPt[i]![j]! = k;
            }
          }
        }
      }
    }

    const balancedLines: string[][] = [];
    let remaining = n;
    let linesLeft = numLines;
    while (linesLeft > 0) {
      const start = splitPt[remaining]![linesLeft]!;
      balancedLines.unshift(words.slice(start, remaining));
      remaining = start;
      linesLeft--;
    }

    for (const lineWords of balancedLines) {
      const text = lineWords.join(" ");
      lines.push({ text, width: measureText(text) });
    }
  };

  if (isTextLayer) {
    const paragraphs = text.split(/\r?\n/);
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        lines.push({ text: "", width: 0 });
        continue;
      }
      const paraWidth = measureText(trimmed);
      if (paraWidth <= maxWidth) {
        lines.push({ text: trimmed, width: paraWidth });
      } else {
        balancedWrap(trimmed.split(/\s+/));
      }
    }
  } else {
    const trimmed = text.trim();
    if (!trimmed) {
      lines.push({ text: "", width: 0 });
    } else {
      const paraWidth = measureText(trimmed);
      if (paraWidth <= maxWidth) {
        lines.push({ text: trimmed, width: paraWidth });
      } else {
        balancedWrap(trimmed.split(/\s+/));
      }
    }
  }

  const isSingleLine = lines.length === 1;
  const extraTopPadding =
    (isSingleLine ? L.extraTopPadding.single : L.extraTopPadding.multi) * scale;
  const extraBottomPadding =
    (isSingleLine ? L.extraBottomPadding.single : L.extraBottomPadding.multi) *
    scale;

  const lineBoxHeight = fontSize + paddingTop + paddingBottom;
  const totalHeight =
    lines.length * lineBoxHeight + extraTopPadding + extraBottomPadding;

  const baseX = position.x * canvasWidth;
  const baseY = position.y * canvasHeight;
  const startY = baseY - totalHeight / 2;

  const consistentPaddingH =
    (isSingleLine ? L.consistentPaddingH.single : L.consistentPaddingH.multi) *
    scale;

  const boxes: LineBox[] = lines.map((line, index) => {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    const boxWidth = line.width + consistentPaddingH * 2;
    const boxX = baseX - boxWidth / 2;
    const extraTop = isFirst ? extraTopPadding : 0;
    const extraBottom = isLast ? extraBottomPadding : 0;
    const boxY =
      startY +
      index * lineBoxHeight -
      (isFirst ? extraTopPadding : 0);
    const boxHeight = lineBoxHeight + extraTop + extraBottom;
    return { boxX, boxY, boxWidth, boxHeight, text: line.text };
  });

  let svgPath = "";
  if (hasBackground && boxes.length > 0) {
    svgPath = buildTikTokSvgPath(boxes, cornerRadius, L.jointRadius);
  }

  const textLines = boxes.map((box, index) => ({
    text: box.text,
    x: baseX,
    y:
      box.boxY +
      (index === 0 ? extraTopPadding : 0) +
      paddingTop +
      fontSize * 0.85,
  }));

  return {
    svgPath,
    hasBackground,
    backgroundColor: style.backgroundColor || "",
    textLines,
    fontSize,
    fontColor: style.fontColor || "#FFFFFF",
    hasStroke,
    strokeColor: style.strokeColor || "#000000",
    strokeWidth: style.strokeWidth || 0,
  };
}

interface FrameAlignedCaption {
  text: string;
  startFrame: number;
  endFrame: number;
}

function convertToFrameAligned(
  captions: CaptionPhrase[],
  fps: number,
  totalFrames: number
): FrameAlignedCaption[] {
  if (captions.length === 0) return [];

  const result: FrameAlignedCaption[] = [];

  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i]!;
    const isFirst = i === 0;
    const isLast = i === captions.length - 1;

    let startFrame: number;
    let endFrame: number;

    if (caption._startFrame !== undefined && caption._endFrame !== undefined) {
      startFrame = caption._startFrame;
      endFrame = caption._endFrame;
    } else {
      startFrame = Math.floor(caption.startTime * fps);
      endFrame =
        Math.floor((caption.startTime + caption.duration) * fps) - 1;
    }

    if (isFirst) {
      startFrame = 0;
    } else {
      const prevEnd = result[i - 1]!.endFrame;
      startFrame = prevEnd + 1;
    }

    if (isLast) {
      endFrame = Math.max(endFrame, totalFrames - 1);
    } else {
      if (endFrame < startFrame) {
        endFrame = startFrame;
      }
    }

    result.push({
      text: caption.text,
      startFrame,
      endFrame,
    });
  }

  for (let i = 0; i < result.length - 1; i++) {
    const current = result[i]!;
    const next = result[i + 1]!;

    if (next.startFrame !== current.endFrame + 1) {
      result[i]!.endFrame = next.startFrame - 1;
    }
  }

  return result;
}

function findCaptionAtFrame(
  captions: FrameAlignedCaption[],
  frame: number
): FrameAlignedCaption | null {
  if (captions.length === 0) return null;

  if (frame < captions[0]!.startFrame) {
    return captions[0]!;
  }

  const lastCaption = captions[captions.length - 1]!;
  if (frame > lastCaption.endFrame) {
    return lastCaption;
  }

  let left = 0;
  let right = captions.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const caption = captions[mid]!;

    if (frame >= caption.startFrame && frame <= caption.endFrame) {
      return caption;
    }

    if (frame < caption.startFrame) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return captions[0]!;
}

const TikTokCaptionContainer: React.FC<{
  text: string;
  visible: boolean;
  style: CaptionStyle;
  position: CaptionPosition;
  canvasWidth: number;
  canvasHeight: number;
}> = React.memo(
  ({ text, visible, style, position, canvasWidth, canvasHeight }) => {
    const layout = useMemo(
      () =>
        calculateTikTokTextLayout(
          text,
          style,
          position,
          canvasWidth,
          canvasHeight
        ),
      [text, style, position, canvasWidth, canvasHeight]
    );

    if (!visible) return null;

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 100,
        }}
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {layout.hasBackground && layout.svgPath && (
          <path d={layout.svgPath} fill={layout.backgroundColor} />
        )}
        {layout.textLines.map((line, index) => (
          <text
            key={index}
            x={line.x}
            y={line.y}
            textAnchor="middle"
            dominantBaseline="alphabetic"
            fontWeight="500"
            fontSize={layout.fontSize}
            fontFamily="TikTok Sans, sans-serif"
            fill={layout.fontColor}
            {...(layout.hasStroke && {
              stroke: layout.strokeColor,
              strokeWidth: layout.strokeWidth,
              paintOrder: "stroke fill",
              strokeLinejoin: "round" as const,
              strokeLinecap: "round" as const,
            })}
          >
            {line.text}
          </text>
        ))}
      </svg>
    );
  }
);
TikTokCaptionContainer.displayName = "TikTokCaptionContainer";

const CaptionContainer: React.FC<{
  text: string;
  visible: boolean;
  style: CaptionStyle;
}> = React.memo(({ text, visible, style }) => {
  const styleType = style.styleType || "pop";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: getVerticalPosition(style),
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    minHeight: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      style.alignment === "left"
        ? "flex-start"
        : style.alignment === "right"
          ? "flex-end"
          : "center",
    textAlign: style.alignment || "center",
    zIndex: 100,
    visibility: visible ? "visible" : "hidden",
    opacity: visible ? 1 : 0,
    contain: "layout style paint",
    pointerEvents: "none",
  };

  const baseTextStyle: React.CSSProperties = {
    fontFamily: getFontFamily(style.fontFamily),
    fontSize: style.fontSize || 28,
    fontWeight: 500,
    lineHeight: 1.25,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxWidth: "100%",
  };

  let textElement: React.ReactNode;

  switch (styleType) {
    case "clean":
      textElement = (
        <span
          style={{
            ...baseTextStyle,
            color: style.fontColor || "#FFFFFF",
            textShadow: `${style.shadowOffsetX ?? 1}px ${style.shadowOffsetY ?? 1}px ${style.shadowBlur ?? 4}px ${style.shadowColor || "rgba(0,0,0,0.6)"}`,
          }}
        >
          {text}
        </span>
      );
      break;

    case "native":
      textElement = (
        <span
          style={{
            ...baseTextStyle,
            color: style.fontColor || "#000000",
            WebkitTextStroke: `${style.strokeWidth || 5}px ${style.strokeColor || "#FFFFFF"}`,
            paintOrder: "stroke fill",
          }}
        >
          {text}
        </span>
      );
      break;

    case "highlight":
      textElement = (
        <span
          style={{
            ...baseTextStyle,
            color: style.fontColor || "#FFFFFF",
            backgroundColor: style.backgroundColor || "#FF0050",
            padding: `${style.backgroundPadding || 8}px ${(style.backgroundPadding || 8) * 2}px`,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            boxShadow: `0 4px 8px ${style.shadowColor || "rgba(0,0,0,0.3)"}`,
          }}
        >
          {text}
        </span>
      );
      break;

    case "pop":
    default:
      textElement = (
        <span
          style={{
            ...baseTextStyle,
            color: style.fontColor || "#FFFFFF",
            WebkitTextStroke: `${style.strokeWidth ?? 1.5}px ${style.strokeColor || "#000000"}`,
            paintOrder: "stroke fill",
            textShadow: `0 ${style.shadowOffsetY ?? 2}px ${style.shadowBlur ?? 3}px ${style.shadowColor || "rgba(0,0,0,0.4)"}`,
            letterSpacing: "0.01em",
          }}
        >
          {text}
        </span>
      );
  }

  return <div style={containerStyle}>{textElement}</div>;
});
CaptionContainer.displayName = "CaptionContainer";

const TikTokTextOverlayLayer: React.FC<{
  layer: TextLayer;
  visible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}> = React.memo(({ layer, visible, canvasWidth, canvasHeight }) => {
  const style = layer.style_config || ({} as CaptionStyle);
  const position = { x: layer.position_x || 0.5, y: layer.position_y || 0.5 };

  const layout = useMemo(
    () =>
      calculateTikTokTextLayout(
        layer.text_content,
        style,
        position,
        canvasWidth,
        canvasHeight,
        true
      ),
    [layer.text_content, style, position, canvasWidth, canvasHeight]
  );

  if (!visible) return null;

  return (
    <g>
      {layout.hasBackground && layout.svgPath && (
        <path d={layout.svgPath} fill={layout.backgroundColor} />
      )}
      {layout.textLines.map((line, index) => (
        <text
          key={index}
          x={line.x}
          y={line.y}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          fontWeight="500"
          fontSize={layout.fontSize}
          fontFamily="TikTok Sans, sans-serif"
          fill={layout.fontColor}
          {...(layout.hasStroke && {
            stroke: layout.strokeColor,
            strokeWidth: layout.strokeWidth,
            paintOrder: "stroke fill",
            strokeLinejoin: "round" as const,
            strokeLinecap: "round" as const,
          })}
        >
          {line.text}
        </text>
      ))}
    </g>
  );
});
TikTokTextOverlayLayer.displayName = "TikTokTextOverlayLayer";

const TextOverlayLayer: React.FC<{
  layer: TextLayer;
  visible: boolean;
}> = React.memo(({ layer, visible }) => {
  const style = layer.style_config || ({} as CaptionStyle);
  const isHighlight = style.styleType === "highlight";

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: `${(layer.position_x || 0.5) * 100}%`,
    top: `${(layer.position_y || 0.5) * 100}%`,
    transform: "translate(-50%, -50%)",
    fontFamily: getFontFamily(style.fontFamily),
    fontSize: style.fontSize || 28,
    fontWeight: 500,
    color: style.fontColor || "#FFFFFF",
    lineHeight: 1.3,
    zIndex: layer.isHook ? 150 : 50,
    textAlign: "center",
    maxWidth: "85%",
    visibility: visible ? "visible" : "hidden",
    opacity: visible ? 1 : 0,
    contain: "layout style paint",
    pointerEvents: "none",
    whiteSpace: "pre-line",
  };

  if (isHighlight && style.backgroundColor) {
    return (
      <div style={{ ...containerStyle, backgroundColor: "transparent" }}>
        <span
          style={{
            backgroundColor: style.backgroundColor,
            padding: `${style.backgroundPadding || 8}px ${(style.backgroundPadding || 8) * 2}px`,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            boxShadow: `0 4px 8px ${style.shadowColor || "rgba(0,0,0,0.3)"}`,
          }}
        >
          {layer.text_content}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...containerStyle,
        WebkitTextStroke:
          (style.strokeWidth || 4) > 0
            ? `${style.strokeWidth || 4}px ${style.strokeColor || "#000000"}`
            : undefined,
        paintOrder: "stroke fill",
        textShadow: style.shadowBlur
          ? `${style.shadowOffsetX || 2}px ${style.shadowOffsetY || 2}px ${style.shadowBlur}px ${style.shadowColor || "rgba(0,0,0,0.5)"}`
          : "2px 2px 4px rgba(0,0,0,0.5)",
      }}
    >
      {layer.text_content}
    </div>
  );
});
TextOverlayLayer.displayName = "TextOverlayLayer";

function isTikTokStyle(
  style: CaptionStyle | null | undefined
): boolean {
  if (!style) return false;
  const tiktokStyleTypes = [
    "white-bg",
    "black-bg",
    "red-bg",
    "outline",
    "plain-white",
  ];
  return (
    !!style.backgroundColor ||
    tiktokStyleTypes.includes(style.styleType || "")
  );
}

export const CaptionedVideo: React.FC<CaptionedVideoProps> = ({
  videoUrl,
  captions = [],
  captionStyle,
  captionPosition,
  textLayers = [],
  captionOnly = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const useTikTokCaptions = isTikTokStyle(captionStyle);
  const effectiveCaptionPosition = captionPosition || { x: 0.5, y: 0.5 };

  const frameAlignedCaptions = useMemo(
    () => convertToFrameAligned(captions, fps, durationInFrames),
    [captions, fps, durationInFrames]
  );

  const textLayerFrameData = useMemo(() => {
    return textLayers.map((layer, index) => {
      const startFrame = Math.floor((layer.start_time || 0) * fps);
      const endFrame =
        Math.floor(
          ((layer.start_time || 0) + (layer.duration || 5)) * fps
        ) - 1;
      return { layer, startFrame, endFrame, index };
    });
  }, [textLayers, fps]);

  const activeCaption = findCaptionAtFrame(frameAlignedCaptions, frame);

  const layerVisibilities = textLayerFrameData.map(
    (data) => frame >= data.startFrame && frame <= data.endFrame
  );

  const hasAnyTikTokTextLayers = textLayers.some((layer) =>
    isTikTokStyle(layer.style_config)
  );

  const wrapperStyle: React.CSSProperties = captionOnly
    ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }
    : { backgroundColor: "#000" };

  return (
    <AbsoluteFill style={wrapperStyle}>
      {!captionOnly && videoUrl && (
        <OffthreadVideo
          src={videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {(hasAnyTikTokTextLayers || useTikTokCaptions) && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 50,
          }}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {textLayerFrameData.map((data, idx) => {
            const isTikTok = isTikTokStyle(data.layer.style_config);
            if (!isTikTok) return null;
            return (
              <TikTokTextOverlayLayer
                key={`tiktok-layer-${data.index}`}
                layer={data.layer}
                visible={layerVisibilities[idx]}
                canvasWidth={width}
                canvasHeight={height}
              />
            );
          })}
        </svg>
      )}

      {captionStyle && useTikTokCaptions && (
        <TikTokCaptionContainer
          key="tiktok-caption"
          text={activeCaption?.text || ""}
          visible={activeCaption !== null}
          style={captionStyle}
          position={effectiveCaptionPosition}
          canvasWidth={width}
          canvasHeight={height}
        />
      )}

      {captionStyle && !useTikTokCaptions && (
        <CaptionContainer
          key="caption"
          text={activeCaption?.text || ""}
          visible={activeCaption !== null}
          style={captionStyle}
        />
      )}

      {textLayerFrameData.map((data, idx) => {
        const isTikTok = isTikTokStyle(data.layer.style_config);
        if (isTikTok) return null;
        return (
          <TextOverlayLayer
            key={`layer-${data.index}`}
            layer={data.layer}
            visible={layerVisibilities[idx]}
          />
        );
      })}
    </AbsoluteFill>
  );
};
