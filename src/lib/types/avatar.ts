export type AvatarMode = "default" | "preset" | "upload";

export type AvatarPresetId =
  | "presenter_female_1"
  | "presenter_male_1"
  | "creator_female_1"
  | "creator_male_1";

export type AvatarSelection = {
  mode: AvatarMode;
  presetId?: AvatarPresetId;
  uploadAssetId?: string;
};
