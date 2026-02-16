export function FinalCta({ id }: { id?: string }) {
  return (
    <section id={id} className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
        Experience the full AI video platform
      </p>
      <a
        href="#generate"
        className="mt-6 inline-flex rounded-lg bg-black px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Sign up
      </a>
    </section>
  );
}
