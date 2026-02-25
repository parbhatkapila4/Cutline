export type ImageSource = "user" | "stock" | "ai-generated";

export interface ImageSpecEntry {
  shotId: string;
  imageUrl: string;
  source: ImageSource;
  fallbackUsed: boolean;
}

export interface ImageSpec {
  entries: ImageSpecEntry[];
}
