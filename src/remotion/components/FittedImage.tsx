import { useCallback, useEffect, useRef, useState } from "react";
import { continueRender, delayRender, useVideoConfig } from "remotion";

const MARGIN = 0.04;
const BACKDROP_RESOLUTION = 1 / 16;
const BACKDROP_BLUR_PX = 3;
const BACKDROP_OVERSCAN = 1.2;
const BACKDROP_BRIGHTNESS = 0.45;

export type FittedImageProps = {
  src: string;
  onError: () => void;
};

export const FittedImage: React.FC<FittedImageProps> = ({ src, onError }) => {
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [foregroundLoaded, setForegroundLoaded] = useState(false);
  const [handle] = useState(() => delayRender(`Loading fitted image ${src.slice(0, 60)}`));
  const released = useRef(false);

  const release = useCallback(() => {
    if (released.current) return;
    released.current = true;
    continueRender(handle);
  }, [handle]);

  const fail = useCallback(() => {
    release();
    onError();
  }, [release, onError]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = fail;
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
      release();
    };
  }, [src, fail, release]);

  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale =
      Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) *
      BACKDROP_OVERSCAN;
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.filter = `blur(${BACKDROP_BLUR_PX}px) brightness(${BACKDROP_BRIGHTNESS})`;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }, [image]);

  useEffect(() => {
    if (image && foregroundLoaded) release();
  }, [image, foregroundLoaded, release]);

  const unit = Math.min(width, height);
  const margin = Math.round(unit * MARGIN);
  const fit = image
    ? Math.min((width - 2 * margin) / image.naturalWidth, (height - 2 * margin) / image.naturalHeight)
    : 0;
  const fittedWidth = image ? Math.round(image.naturalWidth * fit) : 0;
  const fittedHeight = image ? Math.round(image.naturalHeight * fit) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#000" }}>
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(width * BACKDROP_RESOLUTION))}
        height={Math.max(1, Math.round(height * BACKDROP_RESOLUTION))}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {image ? (
        <img
          src={src}
          alt=""
          decoding="sync"
          onLoad={() => setForegroundLoaded(true)}
          onError={fail}
          style={{
            position: "absolute",
            left: Math.round((width - fittedWidth) / 2),
            top: Math.round((height - fittedHeight) / 2),
            width: fittedWidth,
            height: fittedHeight,
            boxShadow: `0 ${Math.round(unit * 0.012)}px ${Math.round(unit * 0.035)}px rgba(0,0,0,0.5)`,
          }}
        />
      ) : null}
    </div>
  );
};
