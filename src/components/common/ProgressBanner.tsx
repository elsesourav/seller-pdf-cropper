import type { ProcessingProgress } from "@/types";

interface ProgressBannerProps {
  progress: ProcessingProgress;
}

export function ProgressBanner({ progress }: ProgressBannerProps) {
  if (!progress.active) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-foreground">
          {progress.stage}
        </span>
        <span className="shrink-0 font-mono font-bold text-primary">
          {progress.percent}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-primary transition-all duration-150"
          style={{ width: `${Math.max(2, Math.min(100, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
