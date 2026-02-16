export function ExampleSection({ id }: { id?: string }) {
  return (
    <section id={id}>
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl">
        See it in action
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-zinc-600">
        One sentence. One video.
      </p>
      <div className="mt-10 flex aspect-video w-full max-w-3xl items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200">
            <svg
              className="h-8 w-8 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-zinc-500">Generate a video to see the result</p>
        </div>
      </div>
    </section>
  );
}
