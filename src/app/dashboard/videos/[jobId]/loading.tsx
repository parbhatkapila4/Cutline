import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="relative w-full pb-20 pt-6 sm:pt-8">
        <div className="mb-5 flex w-full justify-start px-4 sm:mb-6 sm:px-6 lg:px-10">
          <Skeleton className="h-10 w-[188px] rounded-full" />
        </div>

        <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
            <Skeleton className="h-4 w-3/4 max-w-2xl rounded-full" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950 p-5"
              >
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <Skeleton className="h-5 w-32 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={`h-3.5 rounded-full ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-[90%]" : "w-2/3"
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
