import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasAvatar?: boolean;
  hasActions?: boolean;
}

/**
 * Standard table row skeleton component.
 * Produces clean, realistic skeleton rows with subtle variation instead of raw spinners or uniform bars.
 */
export function TableSkeletonRows({
  rows = 8,
  columns = 5,
  hasAvatar = false,
  hasActions = true,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          {hasAvatar ? (
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
              </div>
            </TableCell>
          ) : (
            <TableCell>
              <Skeleton className="h-4 w-28 rounded" />
            </TableCell>
          )}

          {Array.from({ length: Math.max(1, columns - (hasAvatar ? 1 : 1) - (hasActions ? 1 : 0)) }).map(
            (__, j) => {
              // Vary widths realistically
              const widths = ["w-20", "w-24", "w-16", "w-28", "w-14"];
              const width = widths[j % widths.length];
              return (
                <TableCell key={j}>
                  <Skeleton className={`h-4 ${width} rounded`} />
                </TableCell>
              );
            },
          )}

          {hasActions && (
            <TableCell className="text-right">
              <Skeleton className="h-7 w-7 rounded-md ml-auto" />
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Grid of KPI card skeletons for loading state.
 */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-xs animate-pulse">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="size-7 rounded-lg" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Weekly Timetable matrix skeleton.
 */
export function TimetableGridSkeleton() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const slots = 6;

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs animate-pulse">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40 p-3 text-xs font-semibold">
        <div className="w-20">Time</div>
        {days.map((day) => (
          <div key={day} className="text-center">{day}</div>
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: slots }).map((_, r) => (
          <div key={r} className="grid grid-cols-7 p-2 gap-2 min-h-16 items-center">
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-14 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            {Array.from({ length: 6 }).map((__, c) => (
              <div key={c} className="p-1 border-l border-border/40 h-full flex flex-col justify-center">
                {(r + c) % 2 === 0 ? (
                  <Skeleton className="h-12 w-full rounded-lg bg-muted/60" />
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
