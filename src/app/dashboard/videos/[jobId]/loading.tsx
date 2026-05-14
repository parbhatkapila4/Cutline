import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-gray-200/70">
        <div className="max-w-[1440px] mx-auto flex items-center px-5 sm:px-8 h-[60px]">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-[8px]" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-5xl mx-auto space-y-8">

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

          <Skeleton className="aspect-video w-full rounded-2xl" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-32 rounded-md" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className={`h-3.5 rounded-full ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-[90%]" : "w-2/3"}`} />
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
