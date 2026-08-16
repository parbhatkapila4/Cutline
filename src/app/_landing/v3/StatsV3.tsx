"use client";

import type { CSSProperties } from "react";
import { Container, MonoChip, useLive } from "./primitives";

const LILAC = "#8b7ae8";
const AMBER = "#d99b12";
const PEACH = "#ef9c74";
const GREEN = "#5da53c";

const STATS: {
  head: string;
  tint: string;
  tail?: string;

  ramp: [string, string, string, string];
  caption: string;
}[] = [
  {
    head: "60",
    tint: "s",
    ramp: [LILAC, AMBER, PEACH, GREEN],
    caption: "Prompt to finished 1080p MP4, in a single pass",
  },
  {
    head: "1",
    tint: "2",
    ramp: [AMBER, PEACH, GREEN, LILAC],
    caption: "Stages of AI direction behind every render",
  },
  {
    head: "108",
    tint: "0",
    tail: "p",
    ramp: [PEACH, GREEN, LILAC, AMBER],
    caption: "HD on every plan. No watermark, ever",
  },
];

const AUDIENCES = [
  "Content Creators",
  "Marketers",
  "Educators",
  "E-commerce",
  "Social Media",
  "Agencies",
  "Founders",
  "Course Builders",
] as const;

function MarqueeRow({ ariaHidden }: { ariaHidden: boolean }) {
  return (
    <div
      className="flex shrink-0 items-baseline"
      aria-hidden={ariaHidden || undefined}
    >
      {AUDIENCES.map((name) => (
        <span
          key={name}
          className="whitespace-nowrap px-10 font-sans text-[26px] font-normal tracking-[-0.02em] text-[#1d1c1b]/35 sm:text-[30px]"
        >
          {name}
        </span>
      ))}
    </div>
  );
}

export function StatsV3() {
  const { ref, live } = useLive<HTMLDivElement>();

  return (
    <section className="bg-[#f1f0ef] py-20 sm:py-28 lg:py-32">
      <Container>
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="font-sans text-[36px] font-normal leading-[1.07] tracking-[-0.03em] text-[#1d1c1b] sm:text-[46px] lg:text-[54px]">
            Make more, faster,
            <br className="hidden sm:block" /> without a production team
          </h2>
          <p className="mx-auto mt-7 max-w-[560px] font-sans text-[15.5px] font-medium leading-[1.5] text-[#1d1c1b]/70">
            Built for people who need to publish this week - turning the video
            you keep meaning to make into one you can actually post.
          </p>
        </div>

        <div
          ref={ref}
          className={`mt-20 grid grid-cols-1 sm:grid-cols-3 ${live ? "is-live" : ""}`}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.head + stat.tint}
              className="flex min-h-[190px] flex-col justify-between border-t border-[#1d1c1b]/15 px-0 py-8 sm:border-l sm:border-t-0 sm:px-8 sm:py-2 sm:first:pl-0 sm:last:border-r"
            >
              <p className="font-sans text-[62px] font-normal leading-none tracking-[-0.045em] text-[#1d1c1b] sm:text-[76px] lg:text-[86px]">
                {stat.head}
                <span
                  className="v3-tint"
                  style={
                    {
                      "--c1": stat.ramp[0],
                      "--c2": stat.ramp[1],
                      "--c3": stat.ramp[2],
                      "--c4": stat.ramp[3],

                      "--in-delay": `${i * 330}ms`,
                    } as CSSProperties
                  }
                >
                  {stat.tint}
                </span>
                {stat.tail ? <>{stat.tail}</> : null}
              </p>
              <p className="mt-8 max-w-[260px] font-sans text-[15px] font-medium leading-[1.45] text-[#1d1c1b]/75">
                {stat.caption}
              </p>
            </div>
          ))}
        </div>
      </Container>

      <div className="mt-24 text-center">
        <MonoChip>Built for</MonoChip>
      </div>
      <div className="v3-marquee v3-fade-x mt-9 overflow-hidden">
        <div className="v3-marquee-track flex w-max">
          <MarqueeRow ariaHidden={false} />
          <MarqueeRow ariaHidden />
        </div>
      </div>
    </section>
  );
}
