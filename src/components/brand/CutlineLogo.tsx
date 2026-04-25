import Image from "next/image";
import { cn } from "@/lib/utils";

export const CUTLINE_LOGO_SRC = "/cutline-logo.png";

const SIZE_PRESETS = {
  sm: { w: 200, h: 56, className: "h-7 sm:h-8" },
  md: { w: 240, h: 64, className: "h-8 sm:h-9" },
  lg: { w: 320, h: 88, className: "h-11 sm:h-14" },
  hero: { w: 560, h: 160, className: "h-14 sm:h-16 md:h-20 lg:h-24" },
} as const;

export type CutlineLogoSize = keyof typeof SIZE_PRESETS;

export function CutlineLogo({
  size = "md",
  className,
  priority,
}: {
  size?: CutlineLogoSize;
  className?: string;
  priority?: boolean;
}) {
  const preset = SIZE_PRESETS[size];
  return (
    <Image
      src={CUTLINE_LOGO_SRC}
      alt="Cutline"
      width={preset.w}
      height={preset.h}
      priority={priority}
      className={cn(
        preset.className,
        "w-auto max-w-[min(280px,78vw)] object-contain object-left",
        className
      )}
      sizes="(max-width: 640px) 200px, (max-width: 1024px) 260px, 320px"
    />
  );
}
