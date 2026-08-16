import { PendingLabel, Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060606] text-white overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute top-5 left-5 w-9 h-px bg-white/70" />
        <span className="absolute top-5 left-5 h-9 w-px bg-white/70" />
        <span className="absolute top-5 right-5 w-9 h-px bg-white/70" />
        <span className="absolute top-5 right-5 h-9 w-px bg-white/70" />
        <span className="absolute bottom-5 left-5 w-9 h-px bg-white/70" />
        <span className="absolute bottom-5 left-5 h-9 w-px bg-white/70" />
        <span className="absolute bottom-5 right-5 w-9 h-px bg-white/70" />
        <span className="absolute bottom-5 right-5 h-9 w-px bg-white/70" />
      </div>

      <div className="relative w-full max-w-[380px]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 backdrop-blur-sm">
          <Skeleton tone="dark" className="h-10 w-10 rounded-xl" />
          <Skeleton tone="dark" className="mt-5 h-6 w-40 rounded-md" />
          <Skeleton tone="dark" className="mt-2.5 h-3 w-56 rounded-full" />

          <div className="mt-7 flex flex-col gap-3">
            <Skeleton tone="dark" className="h-11 w-full rounded-xl" />
            <Skeleton tone="dark" className="h-11 w-full rounded-xl" />
          </div>

          <Skeleton tone="dark" className="mt-5 h-11 w-full rounded-xl" />

          <div className="mt-6 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-white/[0.07]" />
            <Skeleton tone="dark" className="h-2.5 w-8 rounded-full" />
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>
          <Skeleton tone="dark" className="mt-6 h-11 w-full rounded-xl" />
        </div>

        <div className="mt-8 flex items-center justify-center gap-3 font-mono text-[9px] tracking-[0.32em] uppercase text-white/25">
          <span>Cutline</span>
          <span className="text-white/10">/</span>
          <PendingLabel className="text-white/45">Secure channel</PendingLabel>
        </div>
      </div>
    </div>
  );
}
