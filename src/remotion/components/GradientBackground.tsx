import { AbsoluteFill } from "remotion";

type GradientBackgroundProps = {
  color1: string;
  color2: string;
  angle: number;
};

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  color1,
  color2,
  angle,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${color1}, ${color2})`,
      }}
    />
  );
};
