const points = [
  "No templates — Every video is directed, not assembled from presets.",
  "No manual planning — You don't script shots or storyboard.",
  "Shot-level decisions — The system chooses what each shot is and how long it holds.",
  "Pacing-aware editing — Rhythm and timing are decided, not fixed.",
  "Human-like subtitles — Captions that feel written for the edit.",
];

export function WhatMakesItDifferent() {
  return (
    <section className="border-t border-zinc-200 py-20 md:py-28">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
        What makes it different
      </h2>
      <ul className="mt-8 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-zinc-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
