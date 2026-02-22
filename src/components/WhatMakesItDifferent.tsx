const points = [
  {
    title: "No templates",
    description: "Every video is directed, not assembled from presets.",
  },
  {
    title: "No manual planning",
    description: "You don't script shots or storyboard.",
  },
  {
    title: "Shot-level decisions",
    description: "The system chooses what each shot is and how long it holds.",
  },
  {
    title: "Pacing-aware editing",
    description: "Rhythm and timing are decided, not fixed.",
  },
  {
    title: "Human-like subtitles",
    description: "Captions written for the edit.",
  },
];

export function WhatMakesItDifferent({ id }: { id?: string }) {
  return (
    <section id={id}>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
        What makes it different
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        Built for creators who want direction, not just generation.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((point) => (
          <div
            key={point.title}
            className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <svg
                className="h-5 w-5 text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">{point.title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{point.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
