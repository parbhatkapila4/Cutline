import { Skeleton, SkeletonInline } from "@/components/ui/skeleton";


const NAV_LINKS = ["Platform", "Pricing", "How it works", "Docs"];

const STATS = [
  { value: "12", label: "slideshow stages, one pass" },
  { value: "1080p", label: "mp4, no watermark" },
  { value: "4", label: "ways to make it" },
];

export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#161514] font-sans text-[#f4f3f3]" aria-hidden>
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="px-3 pt-3 sm:px-5">
          <div className="relative flex items-center justify-center overflow-hidden rounded-[10px] bg-[#2a2827] px-6 py-2.5">
            <span
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-70"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(176,214,126,0.25) 30%, rgba(246,220,142,0.3) 55%, rgba(255,212,184,0.3) 75%, rgba(246,205,236,0.32))",
              }}
            />
            <span className="relative z-10 block h-[1lh] text-[13.5px]" />
          </div>
        </div>

        <nav>
          <div className="mx-auto flex h-[74px] w-full max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-10">
            <div className="flex shrink-0 items-center gap-2.5">
              <Skeleton className="h-7 w-7 rounded-[7px]" />
              <SkeletonInline className="text-[19px] font-medium tracking-[-0.02em]">Cutline</SkeletonInline>
            </div>
            <div className="hidden items-center lg:flex">
              {NAV_LINKS.map((label) => (
                <SkeletonInline key={label} className="px-3.5 py-2 text-[14.5px] font-medium">
                  {label}
                </SkeletonInline>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <Skeleton className="h-10 w-[112px] rounded-full" />
              <Skeleton className="hidden h-10 w-[112px] rounded-full sm:block" />
            </div>
          </div>
        </nav>
      </header>

      <section className="relative pb-16 pt-[132px] sm:pb-20 sm:pt-[164px] lg:pb-24 lg:pt-[176px]">
        <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-10">
          <div className="grid gap-y-9 pl-6 sm:gap-y-11 sm:pl-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_auto] lg:gap-x-14 xl:gap-x-20">
            <div className="max-w-[620px] lg:col-start-1 lg:row-start-1">
              <div>
                <SkeletonInline className="inline-flex items-center rounded-[5px] border border-[#f4f3f3]/12 px-2 py-[3px] font-plex text-[10.5px] uppercase tracking-[0.07em]">
                  One sentence → one mp4
                </SkeletonInline>
              </div>

              <div className="mt-6 -mb-[0.1em] pb-[0.1em] text-[52px] leading-[0.98] sm:mt-7 sm:text-[68px] lg:text-[72px] xl:text-[82px]">
                <span className="flex h-[0.98em] items-center">
                  <Skeleton className="h-[0.7em] w-[min(5.4em,100%)] rounded-lg" />
                </span>
                <span className="flex h-[0.98em] items-center">
                  <Skeleton className="h-[0.7em] w-[min(6.3em,100%)] rounded-lg" />
                </span>
              </div>

              <p className="mt-6 max-w-[470px] text-[17px] font-medium leading-[1.5] sm:mt-7 sm:text-[18px]">
                <SkeletonInline>
                  Every video you meant to make is still a sentence in your notes app. Cutline takes the sentence and hands back the finished cut - script, voice, images, captions.
                </SkeletonInline>
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
                <Skeleton className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-[15px] font-medium">
                  Start creating free
                  <span className="h-3.5 w-3.5" />
                </Skeleton>
                <Skeleton className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-6 py-3.5 text-[15px] font-medium">
                  See how it works
                  <span className="h-3.5 w-3.5" />
                </Skeleton>
              </div>

              <p className="mt-5 text-[13.5px] font-medium">
                <SkeletonInline>The free plan includes three renders a month.</SkeletonInline>
              </p>
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
              <div className="rounded-[26px] border border-[#f4f3f3]/12 bg-[#1f1e1d]/80 p-2.5">
                <div className="flex items-center justify-between gap-3 px-2.5 pb-2.5 pt-1.5 font-plex text-[10.5px]">
                  <div className="flex items-center gap-[5px]">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
                    <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
                    <span className="h-[7px] w-[7px] rounded-full bg-[#f4f3f3]/18" />
                  </div>
                  <SkeletonInline className="uppercase tracking-[0.1em]">cutline · render</SkeletonInline>
                  <SkeletonInline className="tracking-[0.05em]">1080p</SkeletonInline>
                </div>
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[#f4f3f3]/10 bg-[#f4f3f3]/[0.045] px-4 py-3">
                  <SkeletonInline className="font-plex text-[12px]">▸</SkeletonInline>
                  <Skeleton className="h-[13px] w-full rounded-full" />
                </div>
                <Skeleton className="mt-2.5 aspect-[16/9] w-full rounded-[16px]" />
                <Skeleton className="mt-2.5 h-[42px] w-full rounded-[12px]" />
                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[16/9] rounded-[8px]" />
                  ))}
                </div>
                <div className="px-1.5 pb-1 pt-3.5">
                  <div className="flex items-baseline justify-between gap-3 font-plex text-[10.5px]">
                    <SkeletonInline className="uppercase tracking-[0.08em]">Stage 01 / 12 · Intent</SkeletonInline>
                    <SkeletonInline className="tabular-nums">0%</SkeletonInline>
                  </div>
                  <div className="mt-2.5 flex gap-[3px]">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span key={i} className="h-[3px] flex-1 rounded-full bg-[#f4f3f3]/10" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid max-w-[620px] grid-cols-3 gap-x-6 border-t border-[#f4f3f3]/12 pt-8 lg:col-start-1 lg:row-start-2">
              {STATS.map((item) => (
                <div key={item.label} className="text-center">
                  <dt className="text-[25px] font-normal tracking-[-0.03em] sm:text-[27px]">
                    <SkeletonInline>{item.value}</SkeletonInline>
                  </dt>
                  <dd className="mt-1 font-plex text-[10.5px] uppercase leading-[1.35] tracking-[0.08em]">
                    <SkeletonInline>{item.label}</SkeletonInline>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
