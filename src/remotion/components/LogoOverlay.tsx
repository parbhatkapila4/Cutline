import { AbsoluteFill, staticFile } from "remotion";

export type LogoPlacement = "outro" | "watermark" | "hero";
export type LogoOverlayProps = {
  logoUrl: string;
  placement: LogoPlacement;
  isOutroShot?: boolean;
  isFirstShot?: boolean;
};

const LOGO_SIZE_WATERMARK = 0.12;
const LOGO_SIZE_HERO = 0.25;
const LOGO_SIZE_OUTRO = 0.2;
const MARGIN = 0.03;

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl,
  placement,
  isOutroShot = false,
  isFirstShot = false,
}) => {
  const showWatermark = placement === "watermark";
  const showOutro = placement === "outro" && isOutroShot;
  const showHero = placement === "hero" && isFirstShot;

  if (!showWatermark && !showOutro && !showHero) {
    return null;
  }

  const size =
    placement === "watermark"
      ? LOGO_SIZE_WATERMARK
      : placement === "hero"
        ? LOGO_SIZE_HERO
        : LOGO_SIZE_OUTRO;

  const src =
    logoUrl.startsWith("http://") || logoUrl.startsWith("https://")
      ? logoUrl
      : staticFile(logoUrl);

  const isWatermark = placement === "watermark" && showWatermark;
  const isOutro = placement === "outro" && showOutro;
  const isHero = placement === "hero" && showHero;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    width: `${size * 100}%`,
    maxWidth: `${size * 100}%`,
    aspectRatio: "1",
    pointerEvents: "none",
  };

  if (isWatermark) {
    containerStyle.right = `${MARGIN * 100}%`;
    containerStyle.bottom = `${MARGIN * 100}%`;
  } else if (isOutro) {
    containerStyle.left = "50%";
    containerStyle.top = "50%";
    containerStyle.transform = "translate(-50%, -50%)";
  } else if (isHero) {
    containerStyle.left = "50%";
    containerStyle.top = `${MARGIN * 100}%`;
    containerStyle.transform = "translateX(-50%)";
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={containerStyle}>
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
