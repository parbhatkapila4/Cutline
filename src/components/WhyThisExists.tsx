export function WhyThisExists({ id }: { id?: string }) {
  return (
    <section id={id} className="flex flex-col md:flex-row md:items-center gap-16">
      <div className="flex-1">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
          AI that directs, not just generates
        </h2>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 leading-relaxed">
          Most video tools generate clips or fill templates. CUTLINE directs. It
          makes the decisions a director and editor make-what to show, when to
          cut, how it should feel-from one sentence of intent.
        </p>
      </div>
      <div className="flex-1">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8">
          <blockquote className="text-lg italic text-zinc-700 leading-relaxed">
            &ldquo;Every video is directed, not assembled from presets.&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}
