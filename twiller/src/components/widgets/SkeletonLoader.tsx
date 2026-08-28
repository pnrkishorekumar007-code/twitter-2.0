import { Skeleton } from "../ui/skeleton";

/**
 * Placeholder for a loading post row — mirrors the PostCard layout
 * (40px avatar, name line, two content lines, action row).
 */
export default function SkeletonLoader() {
  return (
    <div className="flex gap-3 border-b border-border p-4" aria-hidden="true">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>
        <div className="mt-2.5 space-y-2">
          <Skeleton className="h-3.5 w-full rounded-full" />
          <Skeleton className="h-3.5 w-3/4 rounded-full" />
        </div>
        <div className="mt-4 flex max-w-md justify-between">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-12 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
