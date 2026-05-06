import { interpolate, useCurrentFrame } from "remotion";

type MotionLayerProps = {
  motionType: string;
  params: Record<string, unknown>;
  fromFrame: number;
  durationInFrames: number;
  children: React.ReactNode;
};

export const MotionLayer: React.FC<MotionLayerProps> = ({
  motionType,
  params,
  fromFrame,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const frameInSequence = frame - fromFrame;
  const progress = Math.min(
    1,
    Math.max(0, frameInSequence / durationInFrames)
  );

  if (motionType === "static" || motionType === "cut") {
    return <>{children}</>;
  }

  let scale = 1;
  let translateX = 0;
  const translateY = 0;

  if (
    motionType === "push" ||
    motionType === "pull" ||
    motionType === "zoom-in" ||
    motionType === "zoom-out"
  ) {
    const start = (params.startScale as number) ?? 1;
    const end = (params.endScale as number) ?? 1;
    scale = interpolate(progress, [0, 1], [start, end]);
  }

  if (motionType === "pan-left" || motionType === "pan-right") {
    const start = (params.startX as number) ?? 0;
    const end = (params.endX as number) ?? 0;
    translateX = interpolate(progress, [0, 1], [start, end]);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};
