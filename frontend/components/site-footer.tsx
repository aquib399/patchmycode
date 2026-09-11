import { cn } from "@/lib/utils";

interface SiteFooterProps {
  className?: string;
  maxWidth?: string;
}

export function SiteFooter({
  className,
  maxWidth = "max-w-7xl"
}: SiteFooterProps) {
  return (
    <footer className={cn("border-border mt-auto border-t", className)}>
      <div
        className={cn(
          "text-muted-foreground mx-auto flex items-center justify-between px-6 py-8 font-mono text-xs lg:px-8",
          maxWidth
        )}
      >
        <span className="tracking-wider">patchmycode</span>
        <span>review · trace · ship</span>
      </div>
    </footer>
  );
}
