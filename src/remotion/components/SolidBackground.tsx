import { AbsoluteFill } from "remotion";

type SolidBackgroundProps = {
  color: string;
};

export const SolidBackground: React.FC<SolidBackgroundProps> = ({ color }) => {
  return <AbsoluteFill style={{ backgroundColor: color }} />;
};
