"use client";

import { useEffect, useState } from "react";
import { Container, Btn } from "./primitives";
const FRAMES = [23, 21, 22];
const CYCLE_MS = 3000;

export function SecureV3() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % FRAMES.length),
      CYCLE_MS,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <section className="v3-wash-soft py-20 sm:py-28 lg:py-32">
      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="flex justify-center">
            <div className="relative aspect-[16/10] w-full max-w-[460px] overflow-hidden rounded-[32px] border border-[#1d1c1b]/10 bg-[#1d1c1b]/5 shadow-[0_34px_70px_-30px_rgba(29,28,27,0.4)]">
              {FRAMES.map((id, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={id}
                  src={`/hero/${id}.jpg`}
                  alt=""
                  aria-hidden
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                    i === idx ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="border-l border-[#1d1c1b]/16 py-2 pl-6 sm:pl-10">
            <h2 className="font-sans text-[36px] font-normal leading-[1.06] tracking-[-0.03em] text-[#1d1c1b] sm:text-[46px]">
              Yours, end to end
            </h2>
            <p className="mt-6 max-w-[460px] font-sans text-[15.5px] font-medium leading-[1.5] text-[#1d1c1b]/75">
              No watermark on any plan, at any tier. Your uploads stay yours and
              are never used to train anything. Download the master, cancel
              whenever, keep every render you made.
            </p>
            <Btn href="/privacy" variant="light" className="mt-8">
              Learn more
            </Btn>
          </div>
        </div>
      </Container>
    </section>
  );
}
