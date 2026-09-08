"use client";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";

interface InfiniteScrollContainerProps extends React.PropsWithChildren {
  onBottomReached: () => void;
  className?: string;
  hasMore?: boolean;
  isLoading?: boolean;
  rootMargin?: string;
  noContent?: boolean;
}

export default function InfiniteScrollContainer({
  children,
  onBottomReached,
  className,
  hasMore = true,
  isLoading = false,
  rootMargin = "200px",
  noContent
}: InfiniteScrollContainerProps) {
  const { ref } = useInView({
    rootMargin,
    onChange(inView) {
      if (inView && hasMore && !isLoading) {
        onBottomReached();
      }
    }
  });

  return (
    <div className={className}>
      {children}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="mr-2 animate-spin" />
          <span>Loading…</span>
        </div>
      )}
      {noContent ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No results found.
        </p>
      ) : (
        ""
      )}
      {hasMore ? <div ref={ref} className="h-px w-full" aria-hidden /> : null}
    </div>
  );
}
