export const INK = "#1d1c1b";
export const INK_DEEP = "#161514";
export const INK_PANEL = "#232221";
export const PAPER = "#f4f3f3";
export const PAPER_PANEL = "#fbfbfa";

export const LINE = "#d3d1cf";
export const LINE_DARK = "rgba(244,243,243,0.16)";
export const MUTED = "#484746";
export const FAINT = "#8e8d8d";

export const TINT = {
  lilac: "#8b7ae8",
  amber: "#d99b12",
  peach: "#ef9c74",
  green: "#5da53c",
  pink: "#e879b8",
} as const;

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium whitespace-nowrap transition-colors duration-200";

export const BTN_SIZE = {
  md: "px-6 py-3.5 text-[15px]",
  sm: "px-5 py-2.5 text-[14px]",
} as const;

export const BTN_VARIANT = {
  light:
    "border border-[#1d1c1b]/20 text-[#1d1c1b] bg-transparent hover:bg-[#1d1c1b] hover:text-[#f4f3f3]",
  lightSolid: "bg-[#1d1c1b] text-[#f4f3f3] hover:bg-[#3a3836]",
  dark: "border border-[#f4f3f3]/25 text-[#f4f3f3] bg-transparent hover:bg-[#f4f3f3]/10",
  darkSolid: "bg-[#f4f3f3] text-[#1d1c1b] hover:bg-white",
} as const;

export type BtnVariant = keyof typeof BTN_VARIANT;
export type BtnSize = keyof typeof BTN_SIZE;

export function btnClasses(variant: BtnVariant, size: BtnSize = "md") {
  return `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]}`;
}

export const DISPLAY_XL =
  "font-sans font-normal tracking-[-0.03em] leading-[1.04]";
export const DISPLAY_LG =
  "font-sans font-normal tracking-[-0.025em] leading-[1.06]";
export const BODY = "font-sans font-medium leading-[1.5]";

export const MONO_CHIP =
  "inline-flex items-center rounded-[5px] border px-2 py-[3px] font-plex text-[10.5px] uppercase tracking-[0.07em]";
