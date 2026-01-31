export function FinalCta() {
  return (
    <section className="border-t border-zinc-200 py-20 md:py-28">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
        Get early access
      </h2>
      <p className="mt-4 text-zinc-600">
        We're building this. Leave your email if you'd like to be notified.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="email"
          placeholder="you@example.com"
          disabled
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 sm:max-w-xs"
        />
        <button
          type="button"
          disabled
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 opacity-60"
        >
          Notify me
        </button>
      </div>
    </section>
  );
}
