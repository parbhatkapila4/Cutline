import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionedVideo } from "./components/CaptionedVideo";
import { ImageBackground } from "./components/ImageBackground";
import { LogoOverlay } from "./components/LogoOverlay";
import type { CUTLINECompositionProps } from "./types";

const OUTRO_DURATION_SECONDS = 2;

function OutroOverlay({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const progress = durationInFrames > 0 ? frame / durationInFrames : 0;

  const dimOpacity = interpolate(progress, [0, 0.7, 1], [0, 0.6, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markOpacity = interpolate(progress, [0.3, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markScale = interpolate(progress, [0.3, 0.85], [1.06, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const markTranslate = interpolate(progress, [0.3, 0.85], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{ backgroundColor: "#000", opacity: dimOpacity }}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          opacity: markOpacity,
          transform: `translateY(${markTranslate}px) scale(${markScale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#34d399",
              boxShadow:
                "0 0 18px rgba(16,185,129,0.7), 0 0 4px rgba(16,185,129,0.95) inset",
            }}
          />
          <span
            style={{
              color: "#f5f5f5",
              fontFamily:
                "Inter, 'Helvetica Neue', system-ui, -apple-system, sans-serif",
              fontWeight: 900,
              fontSize: 96,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            CUTLINE
          </span>
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.55)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 22,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
          }}
        >
          Made with Cutline
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const FALLBACK_IMAGE = "/fallback.png";

const DEFAULT_CAPTION_STYLE = {
  fontFamily: "Inter",
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: -0.01,
  fontColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 1.6,
  alignment: "center" as const,
  verticalPosition: "bottom" as const,
  yOffset: -56,
  styleType: "pop" as const,
  shadowColor: "rgba(0,0,0,0.6)",
  shadowBlur: 6,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
};

export const CUTLINEComposition: React.FC<CUTLINECompositionProps> = (
  props
) => {
  const { fps, durationInFrames: compositionDurationInFrames } = useVideoConfig();
  const {
    shotList,
    subtitleTrack,
    showCaptions = true,
    motionSpec,
    imageSpec,
    logoUrl,
    logoPlacement,
    audioBase64,
    audioFormat = "wav",
  } = props;

  const captionsForTimeline = useMemo(() => {
    const chunks = [...(subtitleTrack?.chunks ?? [])].sort(
      (a, b) => a.startMs - b.startMs
    );
    return chunks.map((c) => {
      const startTime = c.startMs / 1000;
      const duration = Math.max(0.4, (c.endMs - c.startMs) / 1000);
      return { text: c.text, startTime, duration };
    });
  }, [subtitleTrack?.chunks]);

  const shots = [...(shotList?.shots ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const motionByShot = new Map(
    (motionSpec?.entries ?? []).map((e) => [e.shotId, e])
  );
  const imageByShot = new Map(
    (imageSpec?.entries ?? []).map((e) => [e.shotId, e])
  );
  const getImageForShot = (shotId: string) => {
    const exact = imageByShot.get(shotId);
    if (exact?.imageUrl) return exact.imageUrl;
    const normalized = shotId.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase();
    for (const [id, entry] of imageByShot) {
      if (id.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase() === normalized && entry.imageUrl) {
        return entry.imageUrl;
      }
    }
    return null;
  };

  const audioMime = audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";
  const audioSrc = audioBase64
    ? `data:${audioMime};base64,${audioBase64}`
    : undefined;

  const totalShots = shots.length;
  const shotStartFrames = shots.map((_, index) =>
    shots
      .slice(0, index)
      .reduce((sum, s) => sum + Math.ceil((s.durationSeconds ?? 0) * fps), 0)
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audioSrc && (
        <Audio src={audioSrc} volume={1} />
      )}
      {shots.map((shot, index) => {
        const fromFrame = shotStartFrames[index] ?? 0;
        const durationInFrames = Math.ceil(
          (shot.durationSeconds ?? 0) * fps
        );
        const motionEntry = motionByShot.get(shot.id);
        const imageUrl = getImageForShot(shot.id) ?? FALLBACK_IMAGE;

        const isFirstShot = index === 0;
        const isLastShot = index === totalShots - 1;

        const content = (
          <>
            <ImageBackground
              imageUrl={imageUrl}
              motionType={motionEntry?.motionType ?? "static"}
              motionParams={motionEntry?.params ?? {}}
              fromFrame={fromFrame}
              durationInFrames={durationInFrames}
            />
            {logoUrl && logoPlacement && (
              <LogoOverlay
                logoUrl={logoUrl}
                placement={logoPlacement}
                isOutroShot={isLastShot}
                isFirstShot={isFirstShot}
              />
            )}
          </>
        );

        const seq = (
          <Sequence
            key={shot.id}
            from={fromFrame}
            durationInFrames={durationInFrames}
            name={shot.id}
          >
            <AbsoluteFill>{content}</AbsoluteFill>
          </Sequence>
        );

        return seq;
      })}
      {showCaptions && captionsForTimeline.length > 0 && (
        <CaptionedVideo
          captionOnly
          captions={captionsForTimeline}
          captionStyle={DEFAULT_CAPTION_STYLE}
          captionPosition={{ x: 0.5, y: 0.86 }}
        />
      )}

      {(() => {
        const outroFrames = Math.min(
          Math.round(OUTRO_DURATION_SECONDS * fps),
          compositionDurationInFrames
        );
        if (outroFrames <= 0) return null;
        const outroStart = compositionDurationInFrames - outroFrames;
        return (
          <Sequence
            from={outroStart}
            durationInFrames={outroFrames}
            name="cutline-outro"
            layout="none"
          >
            <OutroOverlay durationInFrames={outroFrames} />
          </Sequence>
        );
      })()}
    </AbsoluteFill>
  );
};
