import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">

        <div className="text-center space-y-3">
          <Skeleton className="w-12 h-12 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-40 rounded-md mx-auto" />
          <Skeleton className="h-3.5 w-56 rounded-full mx-auto" />
        </div>

        <Skeleton className="h-11 w-full rounded-lg" />

        <div className="flex items-center gap-3">
          <Skeleton className="h-px flex-1" />
          <Skeleton className="h-3 w-8 rounded-full" />
          <Skeleton className="h-px flex-1" />
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 rounded-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>

        <Skeleton className="h-11 w-full rounded-lg" />

        <div className="flex items-center justify-center gap-1 pt-2">
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>

      </div>
    </div>
  );
}
