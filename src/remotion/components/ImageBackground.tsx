
import { useCurrentFrame } from "remotion";
import { staticFile } from "remotion";
import { useCallback, useState } from "react";
import { FittedImage } from "./FittedImage";
import { kenBurnsTransform } from "../kenBurns";

export type ImageBackgroundProps = {
  imageUrl: string;
  motionType: string;
  motionParams: Record<string, unknown>;
  durationInFrames: number;
  fit?: "cover" | "contain";
};

export const ImageBackground: React.FC<ImageBackgroundProps> = ({
  imageUrl,
  motionType,
  motionParams,
  durationInFrames,
  fit = "cover",
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, Math.max(0, frame / durationInFrames));

  const [loadError, setLoadError] = useState(false);
  const handleError = useCallback(() => {
    setLoadError(true);
  }, []);

  if (loadError) {
    throw new Error(`Image failed to load: ${imageUrl}`);
  }

  const src =
    imageUrl.startsWith("data:")
      ? imageUrl
      : imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
        ? imageUrl
        : staticFile(imageUrl);

  if (fit === "contain") {
    return <FittedImage src={src} onError={handleError} />;
  }

  const { scale, translateX, translateY } = kenBurnsTransform(motionType, motionParams, progress);

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
