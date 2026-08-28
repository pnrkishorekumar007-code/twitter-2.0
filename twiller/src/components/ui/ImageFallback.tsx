import { ImageOff } from "lucide-react";

/** Muted placeholder shown when an image fails to load. Keeps layout stable. */
export default function ImageFallback({
  label = "Image unavailable",
}: {
  label?: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60 text-muted-foreground">
      <ImageOff className="h-6 w-6 shrink-0" />
      <span className="px-3 text-center text-xs">{label}</span>
    </div>
  );
}
