export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="500 flex h-full w-full grow items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-muted-foreground text-sm">{text}</p>
      </div>
    </div>
  );
}
