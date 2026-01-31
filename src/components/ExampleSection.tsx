export function ExampleSection() {
  return (
    <section className="border-t border-zinc-200 py-20 md:py-28">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
        Example
      </h2>
      <div className="mt-8 flex aspect-video w-full max-w-3xl items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100">
        <span className="text-zinc-400 text-sm">Video placeholder</span>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Generated from one sentence of intent.
      </p>
    </section>
  );
}
