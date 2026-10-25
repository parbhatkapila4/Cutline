const BASE =
  "relative inline-flex h-[34px] items-center justify-center gap-[7px] whitespace-nowrap rounded-[9px] px-[13px] text-[13px] font-medium transition-[background-color,box-shadow,color] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[15px] [&_svg]:shrink-0";

export const BTN_PRIMARY = `${BASE} bg-linear-to-b from-white to-[#e4e4e8] text-[#0b0b0c] shadow-[inset_0_1px_0_#fff,inset_0_-1px_0_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.12),0_2px_6px_-1px_rgba(0,0,0,0.5)] hover:to-[#f0f0f2]`;

export const BTN_SECONDARY = `${BASE} bg-[#17171b] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4)] hover:bg-[#1e1e23]`;

export const BTN_GOLD = `${BASE} bg-linear-to-b from-[#ffd27a] to-[#f2a92c] font-semibold text-[#1b1405] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.15),0_0_0_1px_rgba(242,169,44,0.55),0_8px_24px_-10px_rgba(244,183,64,0.6)] hover:from-[#ffdb8f] hover:to-[#f5b23d]`;

export const BTN_GHOST = `${BASE} text-zinc-400 hover:bg-white/5 hover:text-zinc-100`;

export const BTN_SM = "h-[30px] rounded-lg px-2.5 text-[12.5px]";

export const ICON_BTN =
  "inline-grid size-[34px] place-items-center rounded-[9px] text-zinc-400 transition-colors hover:bg-white/6 hover:text-zinc-100 [&_svg]:size-[17px]";
