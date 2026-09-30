import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Skeleton className="h-9 w-[150px] rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <main className="px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
          </div>

          <div className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/80 p-6">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
            <div className="flex items-center justify-between border-t border-white/8 pt-4">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-11 w-40 rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-32 rounded-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
