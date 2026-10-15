import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionedVideo } from "./components/CaptionedVideo";
import { ImageBackground } from "./components/ImageBackground";
import { LogoOverlay } from "./components/LogoOverlay";
import { ENDING_FADE_SECONDS } from "./ending";
import type { CUTLINECompositionProps } from "./types";

const FALLBACK_IMAGE = "/fallback.png";

function EndingFade({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity, zIndex: 1000 }} />;
}

const DEFAULT_CAPTION_STYLE = {
  fontFamily: "Inter",
  fontColor: "#FFFFFF",
  styleType: "pill" as const,
};

export const CUTLINEComposition: React.FC<CUTLINECompositionProps> = (
  props
) => {
  const { fps, durationInFrames: compositionFrames } = useVideoConfig();
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
    if (exact?.imageUrl) return exact;
    const normalized = shotId.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase();
    for (const [id, entry] of imageByShot) {
      if (id.replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase() === normalized && entry.imageUrl) {
        return entry;
      }
    }
    return null;
  };

  const audioMime = audioFormat === "mp3" ? "audio/mpeg" : "audio/wav";
  const audioSrc = audioBase64
    ? `data:${audioMime};base64,${audioBase64}`
    : undefined;

  const totalShots = shots.length;
  const fadeFrames = Math.min(Math.round(ENDING_FADE_SECONDS * fps), compositionFrames);
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
        const isFirstShot = index === 0;
        const isLastShot = index === totalShots - 1;
        const shotFrames = Math.ceil(
          (shot.durationSeconds ?? 0) * fps
        );
        const durationInFrames = isLastShot
          ? Math.max(shotFrames, compositionFrames - fromFrame)
          : shotFrames;
        const motionEntry = motionByShot.get(shot.id);
        const image = getImageForShot(shot.id);

        const content = (
          <>
            <ImageBackground
              imageUrl={image?.imageUrl ?? FALLBACK_IMAGE}
              fit={image?.fit}
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
        />
      )}
      {fadeFrames > 0 && (
        <Sequence
          from={compositionFrames - fadeFrames}
          durationInFrames={fadeFrames}
          name="ending-fade"
          layout="none"
        >
          <EndingFade durationInFrames={fadeFrames} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
