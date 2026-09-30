import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <div className="fixed left-0 right-0 top-0 z-50 flex justify-start px-6 py-4">
        <Skeleton className="h-9 w-[150px] rounded-lg" />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-20 sm:px-6">
        <div className="w-full max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
            <div className="grid min-h-[520px] lg:grid-cols-2">
              <div className="space-y-6 p-6 sm:p-8">
                <div className="space-y-3">
                  <Skeleton className="h-8 w-2/3 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-4/5 rounded-full" />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16 rounded-full" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="h-11 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>

              <div className="space-y-6 border-t border-white/10 bg-white/[0.02] p-6 sm:p-8 lg:border-l lg:border-t-0">
                <Skeleton className="h-3 w-20 rounded-full" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2 pt-1">
                      <Skeleton className="h-3.5 w-1/2 rounded-full" />
                      <Skeleton className="h-3 w-3/4 rounded-full" />
                    </div>
                  </div>
                ))}
                <div className="space-y-2 pt-4">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-3 w-[88%] rounded-full" />
                  <Skeleton className="h-3 w-2/3 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
