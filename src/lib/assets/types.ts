export type AssetType =
  | "logo"
  | "productPhoto"
  | "referenceVideo"
  | "referenceImage";

export interface AssetMetadata {
  id: string;
  type: AssetType;
  path: string;
  originalFilename: string;
  mimeType: string;
  /** Canonical identifier of the uploader (userId / anon session / IP). Used
   *  to authorize the asset GET route. Optional for backward compatibility
   *  with assets uploaded before owner tracking existed. */
  ownerId?: string;
}

export interface BrandColors {
  primary: string;
  secondary?: string;
}

export interface LogoAnalysis {
  dominantColors: string[];
  aspectRatio: number;
  hasTransparency: boolean;
  suggestedPlacement: "outro" | "watermark" | "hero";
}

export interface ProductPhotoAnalysis {
  dominantColors: string[];
  aspectRatio: number;
  subjectDescription: string;
  suggestedShotTypes: ("establish" | "detail" | "hero" | "transition")[];
}

export interface ReferenceVideoAnalysis {
  keyFramePaths: string[];
  colorPalette: string[];
  cutsPerMinute?: number;
}

export interface ReferenceImageAnalysis {
  colorPalette: string[];
  moodDescription: string;
}

export interface AnalyzedAssets {
  logo?: LogoAnalysis;
  productPhotos?: ProductPhotoAnalysis[];
  brandColors?: { primary: string; secondary?: string };
  referenceVideo?: ReferenceVideoAnalysis;
  referenceImages?: ReferenceImageAnalysis[];
}
