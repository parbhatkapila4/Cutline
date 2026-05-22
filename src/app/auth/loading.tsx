export default function Loading() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#060606] text-white overflow-hidden">
      {/* Film grain — visual continuity with the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* Corner brackets — frame the loader the same way the hero is framed */}
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

      {/* Centered cinema spinner stack */}
      <div className="relative flex flex-col items-center gap-10">
        <div className="relative w-[112px] h-[112px]" aria-hidden>
          {/* Outer ring — slow CW, white marker */}
          <div className="absolute inset-0 rounded-full border border-white/[0.10] auth-spin-cw-slow">
            <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/65 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>

          {/* Middle ring — faster CCW, emerald marker */}
          <div className="absolute inset-4 rounded-full border border-emerald-400/[0.18] auth-spin-ccw-mid">
            <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400/85 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
          </div>

          {/* Inner ring — fastest CW, bright marker */}
          <div className="absolute inset-9 rounded-full border border-emerald-400/[0.35] auth-spin-cw-fast">
            <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" />
          </div>

          {/* Center pulse */}
          <span className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 auth-pulse" />
        </div>

        {/* Status: "AUTHENTICATING ●●●" */}
        <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.42em] uppercase text-white/55">
          <span>Authenticating</span>
          <span className="inline-flex gap-[3px]">
            <span className="w-1 h-1 rounded-full bg-emerald-400 auth-dot auth-dot-0" />
            <span className="w-1 h-1 rounded-full bg-emerald-400 auth-dot auth-dot-1" />
            <span className="w-1 h-1 rounded-full bg-emerald-400 auth-dot auth-dot-2" />
          </span>
        </div>

        {/* Slate footer */}
        <div className="font-mono text-[9px] tracking-[0.32em] uppercase text-white/25 flex items-center gap-3">
          <span>Cutline</span>
          <span className="text-white/10">/</span>
          <span>Secure Channel</span>
        </div>
      </div>

      <style>{`
        @keyframes auth-spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes auth-spin-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes auth-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes auth-dot { 0%, 100% { opacity: 0.18; } 50% { opacity: 1; } }
        .auth-spin-cw-slow { animation: auth-spin-cw 5.2s linear infinite; }
        .auth-spin-ccw-mid { animation: auth-spin-ccw 3.2s linear infinite; }
        .auth-spin-cw-fast { animation: auth-spin-cw 1.8s linear infinite; }
        .auth-pulse { animation: auth-pulse 1.6s ease-in-out infinite; }
        .auth-dot { animation: auth-dot 1.4s ease-in-out infinite; }
        .auth-dot-0 { animation-delay: 0s; }
        .auth-dot-1 { animation-delay: 0.18s; }
        .auth-dot-2 { animation-delay: 0.36s; }
        @media (prefers-reduced-motion: reduce) {
          .auth-spin-cw-slow,
          .auth-spin-ccw-mid,
          .auth-spin-cw-fast,
          .auth-pulse,
          .auth-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
