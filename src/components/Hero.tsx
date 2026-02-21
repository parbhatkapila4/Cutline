"use client";

export function Hero() {
  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-16">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl md:text-[64px] leading-[1.1]">
          The most realistic AI video platform
        </h1>
        <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-zinc-600 leading-relaxed">
          AI video models and products powering creators and enterprises. From low-latency
          generation to the leading AI video generator for explainers and ads. No scripts. No storyboards.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#generate"
            className="inline-flex items-center justify-center rounded-full bg-black px-8 py-4 text-xs font-bold text-white uppercase tracking-widest transition hover:bg-zinc-800"
          >
            Sign up
          </a>
          <a
            href="#generate"
            className="inline-flex items-center justify-center rounded-full border-2 border-zinc-900 bg-transparent px-8 py-4 text-xs font-bold text-zinc-900 uppercase tracking-widest transition hover:bg-zinc-50"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </section>
  );
}
