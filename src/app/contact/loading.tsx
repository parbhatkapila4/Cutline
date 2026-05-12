import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">

          <div className="text-center space-y-3 mb-12">
            <Skeleton className="h-4 w-24 rounded-full mx-auto" />
            <Skeleton className="h-12 w-2/3 max-w-xl rounded-md mx-auto" />
            <Skeleton className="h-4 w-full max-w-md rounded-full mx-auto" />
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="px-8 sm:px-10 lg:px-12 py-10 space-y-6">
              <div className="grid sm:grid-cols-2 gap-5">
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
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
              <div className="flex justify-end pt-2">
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
            </div>
            <div className="px-8 sm:px-10 lg:px-12 py-6 border-t border-zinc-200 bg-zinc-50/50 flex justify-center">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-4 w-44 rounded-full" />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
