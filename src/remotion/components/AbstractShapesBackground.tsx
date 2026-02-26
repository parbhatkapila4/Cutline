import { AbsoluteFill } from "remotion";

type AbstractShapesBackgroundProps = {
  baseColor: string;
  accentColor: string;
  shapeCount: number;
};

const shapes = [
  { left: "10%", top: "20%", width: 120, height: 120, borderRadius: "50%" },
  { left: "70%", top: "60%", width: 80, height: 80, borderRadius: "8px" },
  { left: "50%", top: "30%", width: 100, height: 100, borderRadius: "50%" },
  { left: "20%", top: "70%", width: 60, height: 60, borderRadius: "8px" },
  { left: "80%", top: "15%", width: 90, height: 90, borderRadius: "50%" },
  { left: "35%", top: "80%", width: 70, height: 70, borderRadius: "8px" },
];

export const AbstractShapesBackground: React.FC<AbstractShapesBackgroundProps> = ({
  baseColor,
  accentColor,
  shapeCount,
}) => {
  const toUse = shapes.slice(0, Math.min(shapeCount, shapes.length));
  return (
    <AbsoluteFill style={{ backgroundColor: baseColor }}>
      {toUse.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            borderRadius: s.borderRadius,
            backgroundColor: i % 2 === 0 ? accentColor : baseColor,
            opacity: 0.4,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
