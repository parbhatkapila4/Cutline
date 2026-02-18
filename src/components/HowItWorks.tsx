const steps = [
  {
    title: "Intent",
    description: "You give one sentence describing what you want the video to do.",
    icon: "01",
  },
  {
    title: "Direction",
    description: "The system decides narrative, pacing, and shot design.",
    icon: "02",
  },
  {
    title: "Editing",
    description: "It cuts, times, and layers the edit.",
    icon: "03",
  },
  {
    title: "Final Video",
    description: "You get a finished short video. No templates.",
    icon: "04",
  },
];

export function HowItWorks({ id }: { id?: string }) {
  return (
    <section id={id}>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
        How it works
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        From one sentence to a polished video in four steps.
      </p>
      <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <span className="text-2xl font-bold text-zinc-400">
              {step.icon}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">
              {step.title}
            </h3>
            <p className="mt-2 text-zinc-600 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
