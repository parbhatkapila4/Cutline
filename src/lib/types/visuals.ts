export type BackgroundType = "gradient" | "solid" | "abstract-shapes";
export interface GradientParams {
  color1: string;
  color2: string;
  angle: number;
}

export interface SolidParams {
  color: string;
}

export interface AbstractShapesParams {
  baseColor: string;
  accentColor: string;
  shapeCount: number;
}

export type VisualParams = GradientParams | SolidParams | AbstractShapesParams;

export interface VisualSpecEntry {
  shotId: string;
  backgroundType: BackgroundType;
  params: VisualParams;
  order: number;
}

export interface VisualSpec {
  entries: VisualSpecEntry[];
}
