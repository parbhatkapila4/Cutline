const steps = [
  {
    title: "Intent",
    description: "You give one sentence of what you want the video to do.",
  },
  {
    title: "Direction",
    description:
      "The system decides narrative, pacing, and shot design.",
  },
  {
    title: "Editing",
    description: "It cuts, times, and layers the edit.",
  },
  {
    title: "Final video",
    description: "You get a finished video. No templates.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-zinc-200 py-20 md:py-28">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
        How it works
      </h2>
      <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.title}>
            <span className="text-sm font-medium text-zinc-400">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-1 text-lg font-medium text-zinc-900">
              {step.title}
            </h3>
            <p className="mt-2 text-zinc-600">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
