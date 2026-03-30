import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from "remotion";
import { CaptionedVideo } from "./components/CaptionedVideo";
import { ImageBackground } from "./components/ImageBackground";
import { LogoOverlay } from "./components/LogoOverlay";
import type { CUTLINECompositionProps } from "./types";

const FALLBACK_IMAGE = "/fallback.png";

const DEFAULT_CAPTION_STYLE = {
  fontFamily: "TikTok Sans",
  fontSize: 28,
  fontColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 1.2,
  alignment: "center" as const,
  verticalPosition: "bottom" as const,
  yOffset: 0,
  styleType: "clean" as const,
};

export const CUTLINEComposition: React.FC<CUTLINECompositionProps> = (
  props
) => {
  const { fps } = useVideoConfig();
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

  let fromFrame = 0;
  const totalShots = shots.length;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {audioSrc && (
        <Audio src={audioSrc} volume={1} />
      )}
      {shots.map((shot, index) => {
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

        fromFrame += durationInFrames;
        return seq;
      })}
      {showCaptions && captionsForTimeline.length > 0 && (
        <CaptionedVideo
          captionOnly
          captions={captionsForTimeline}
          captionStyle={DEFAULT_CAPTION_STYLE}
          captionPosition={{ x: 0.5, y: 0.82 }}
        />
      )}
    </AbsoluteFill>
  );
};
