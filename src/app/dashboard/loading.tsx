import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-white/10 bg-zinc-950 p-5 lg:flex">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-[10px]" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>

        <div className="mt-8 space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-4 w-4 rounded-sm" />
              <Skeleton className={`h-3.5 rounded-full ${i % 2 ? "w-20" : "w-24"}`} />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4 rounded-xl border border-white/10 p-4">
          <Skeleton className="h-3.5 w-14 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-white/10 p-4">
          <Skeleton className="h-3.5 w-10 rounded-md" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="mt-3 h-9 w-full rounded-lg" />
        </div>

        <Skeleton className="mt-auto h-10 w-full rounded-lg" />
      </aside>

      <main className="min-w-0 flex-1 px-6 pb-16 pt-20 lg:px-10 lg:pt-8 xl:px-12">
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-[10px]" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>

        <section className="mb-10 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-4 w-80 max-w-full rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5"
              >
                <Skeleton className="h-3 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
              >
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
