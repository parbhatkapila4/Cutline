export const PILL_BASE =
  "inline-flex items-center justify-center gap-2 rounded-[6px] font-medium font-sans transition-colors duration-200 whitespace-nowrap";

export const PILL_SIZE = {
  md: "px-6 py-3 text-[15px]",
  sm: "px-5 py-2.5 text-[14px]",
} as const;

export const PILL_VARIANT = {
  primary: "bg-[#111] text-[#f4f3ec] hover:bg-[#ff5600] hover:text-[#111]",
  secondary:
    "border border-[#111]/25 text-[#111] bg-transparent hover:border-[#111]",
  primaryOnDark: "bg-[#f4f3ec] text-[#111] hover:bg-[#ff5600] hover:text-[#111]",
  secondaryOnDark:
    "border border-[#f4f3ec]/30 text-[#f4f3ec] bg-transparent hover:border-[#f4f3ec]",
} as const;

export type PillVariant = keyof typeof PILL_VARIANT;
export type PillSize = keyof typeof PILL_SIZE;

export function pillClasses(variant: PillVariant, size: PillSize = "md") {
  return `${PILL_BASE} ${PILL_SIZE[size]} ${PILL_VARIANT[variant]}`;
}
