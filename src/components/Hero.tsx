export function Hero() {
  return (
    <section className="pt-24 pb-32 md:pt-32 md:pb-40">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
        One sentence. A full video.
      </h1>
      <p className="mt-6 max-w-xl text-xl text-zinc-600 md:text-2xl">
        Describe what you want. CUTLINE decides narrative, pacing, motion, and
        subtitles—and delivers a finished edit.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3.5 text-zinc-500 sm:py-4">
          <span className="text-base sm:text-lg">
            e.g. A 60-second explainer on how solar panels work
          </span>
        </div>
        <button
          type="button"
          disabled
          className="shrink-0 rounded-lg bg-zinc-900 px-6 py-3.5 text-base font-medium text-white opacity-60 sm:py-4"
        >
          Generate video
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        No scripts. No assets. One sentence.
      </p>
    </section>
  );
}
