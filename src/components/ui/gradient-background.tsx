"use client";

/**
 * Shared gradient background: rose orbs + grid + film grain.
 * Used on /create and auth/sign-in.
 */
export function GradientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div
        className="absolute top-[-30%] left-[20%] w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(225,29,72,0.08) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,113,133,0.05) 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-[40%] left-[-10%] w-[400px] h-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(244,63,94,0.04) 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
