import type { Intent, ShotList } from "@/lib/types";
import type { ShotPurpose } from "@/lib/types";
import type {
  AbstractShapesParams,
  BackgroundType,
  GradientParams,
  SolidParams,
  VisualSpec,
  VisualSpecEntry,
  VisualParams,
} from "@/lib/types/visuals";
import type { AnalyzedAssets } from "@/lib/assets/types";
const PALETTES = {
  serious: {
    gradient: [
      { color1: "#1a1a2e", color2: "#16213e" },
      { color1: "#0f3460", color2: "#1a1a2e" },
      { color1: "#16213e", color2: "#0f3460" },
    ],
    solid: ["#1a1a2e", "#16213e", "#0f3460", "#e8e8e8"],
    abstract: { base: "#1a1a2e", accents: ["#e94560", "#0f3460", "#e8e8e8"] },
  },
  playful: {
    gradient: [
      { color1: "#ff6b6b", color2: "#feca57" },
      { color1: "#ff9ff3", color2: "#f8b500" },
      { color1: "#feca57", color2: "#ff9ff3" },
    ],
    solid: ["#ff6b6b", "#feca57", "#ff9ff3", "#f8b500"],
    abstract: { base: "#fff5f5", accents: ["#ff6b6b", "#feca57", "#ff9ff3"] },
  },
  urgent: {
    gradient: [
      { color1: "#0d0d0d", color2: "#1d3557" },
      { color1: "#e63946", color2: "#0d0d0d" },
      { color1: "#1d3557", color2: "#e63946" },
    ],
    solid: ["#0d0d0d", "#e63946", "#1d3557", "#ffffff"],
    abstract: { base: "#0d0d0d", accents: ["#e63946", "#ffffff", "#1d3557"] },
  },
} as const;

function purposeToBackgroundType(purpose: ShotPurpose): BackgroundType {
  switch (purpose) {
    case "establish":
    case "reveal":
      return "gradient";
    case "emphasize":
      return "abstract-shapes";
    case "transition":
    case "hold":
    default:
      return "solid";
  }
}

function getGradientParams(
  tone: keyof typeof PALETTES,
  order: number
): GradientParams {
  const pal = PALETTES[tone].gradient;
  const pair = pal[order % pal.length]!;
  const angle = (order * 45) % 360;
  return { color1: pair.color1, color2: pair.color2, angle };
}

function getSolidParams(tone: keyof typeof PALETTES, order: number): SolidParams {
  const colors = PALETTES[tone].solid;
  const color = colors[order % colors.length]!;
  return { color };
}

function getAbstractShapesParams(
  tone: keyof typeof PALETTES,
  order: number
): AbstractShapesParams {
  const pal = PALETTES[tone].abstract;
  const accentColor = pal.accents[order % pal.accents.length]!;
  const shapeCount = 3 + (order % 4);
  return { baseColor: pal.base, accentColor, shapeCount };
}

export function composeVisuals(
  intent: Intent,
  shotList: ShotList,
  _analyzedAssets?: AnalyzedAssets
): VisualSpec {
  const tone = intent.tone;
  const shots = [...shotList.shots].sort((a, b) => a.order - b.order);
  const entries: VisualSpecEntry[] = shots.map((shot, index) => {
    const backgroundType = purposeToBackgroundType(shot.purpose);
    let params: VisualParams;
    switch (backgroundType) {
      case "gradient":
        params = getGradientParams(tone, index);
        break;
      case "solid":
        params = getSolidParams(tone, index);
        break;
      case "abstract-shapes":
        params = getAbstractShapesParams(tone, index);
        break;
      default: {
        const _: never = backgroundType;
        params = getSolidParams(tone, index);
      }
    }
    return {
      shotId: shot.id,
      backgroundType,
      params,
      order: shot.order,
    };
  });
  return { entries };
}
