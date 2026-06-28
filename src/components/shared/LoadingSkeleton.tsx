import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  /** Number of skeleton rows/cards to render */
  count?: number;
  className?: string;
  itemClassName?: string;
}

/** Generic loading placeholder (skeleton, not spinner — UI_Guide §8). */
export function LoadingSkeleton({
  count = 3,
  className,
  itemClassName,
}: LoadingSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-20 w-full", itemClassName)} />
      ))}
    </div>
  );
}
