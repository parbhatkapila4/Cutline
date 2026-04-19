
import { interpolate, useCurrentFrame } from "remotion";
import { staticFile } from "remotion";
import { useCallback, useState } from "react";

export type ImageBackgroundProps = {
  imageUrl: string;
  motionType: string;
  motionParams: Record<string, unknown>;
  fromFrame: number;
  durationInFrames: number;
};

export const ImageBackground: React.FC<ImageBackgroundProps> = ({
  imageUrl,
  motionType,
  motionParams,
  fromFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const frameInSequence = frame - fromFrame;
  const progress = Math.min(
    1,
    Math.max(0, frameInSequence / durationInFrames)
  );

  const [loadError, setLoadError] = useState(false);
  const handleError = useCallback(() => {
    setLoadError(true);
  }, []);

  if (loadError) {
    throw new Error(`Image failed to load: ${imageUrl}`);
  }

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (
    motionType === "push" ||
    motionType === "pull" ||
    motionType === "zoom-in" ||
    motionType === "zoom-out"
  ) {
    const start = (motionParams.startScale as number) ?? 1;
    const end = (motionParams.endScale as number) ?? 1;
    scale = interpolate(progress, [0, 1], [start, end]);
  }

  if (motionType === "pan-left" || motionType === "pan-right") {
    const start = (motionParams.startX as number) ?? 0;
    const end = (motionParams.endX as number) ?? 0;
    translateX = interpolate(progress, [0, 1], [start, end]);
  }

  if (motionParams.startY !== undefined && motionParams.endY !== undefined) {
    const startY = (motionParams.startY as number) ?? 0;
    const endY = (motionParams.endY as number) ?? 0;
    translateY = interpolate(progress, [0, 1], [startY, endY]);
  }

  const src =
    imageUrl.startsWith("data:")
      ? imageUrl
      : imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
        ? imageUrl
        : staticFile(imageUrl);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        transformOrigin: "center center",
      }}
    >
      <img
        src={src}
        onError={handleError}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
};
