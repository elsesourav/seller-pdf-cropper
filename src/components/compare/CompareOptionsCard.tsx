import type { ProcessingProgress } from "@/types";
import { formatCount } from "@/utils/format";
import { Button, Card, SquishSwitch } from "@elsesourav/react-ui";
import { GitCompareArrows } from "lucide-react";
import { ProgressBanner } from "../common/ProgressBanner";

interface CompareOptionsCardProps {
  set1TotalPages: number;
  excludeTotalPages: number;
  deduplicateSet1: boolean;
  onDeduplicateSet1Change: (value: boolean) => void;
  progress: ProcessingProgress;
  onRunCompare: () => void;
}

export function CompareOptionsCard({
  set1TotalPages,
  excludeTotalPages,
  deduplicateSet1,
  onDeduplicateSet1Change,
  progress,
  onRunCompare,
}: CompareOptionsCardProps) {
  return (
    <Card variant="default" className="space-y-3 border-border/80 bg-card/95 p-3.5 sm:p-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onDeduplicateSet1Change(!deduplicateSet1)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onDeduplicateSet1Change(!deduplicateSet1);
            }
          }}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-subtle/50 px-3.5 py-2.5 select-none sm:min-w-[180px]"
        >
          <span className="text-xs font-bold text-foreground">Dedupe Set 1</span>
          <div onClick={(e) => e.stopPropagation()}>
            <SquishSwitch
              checked={deduplicateSet1}
              onChange={onDeduplicateSet1Change}
              size="sm"
              variant="success"
              ariaLabel="Deduplicate Set 1"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={progress.active}
          disabled={progress.active}
          leftIcon={
            progress.active ? undefined : <GitCompareArrows className="h-4 w-4" />
          }
          onClick={onRunCompare}
          className="flex-1 whitespace-nowrap font-bold"
        >
          {progress.active
            ? "Comparing..."
            : `Compare (${formatCount(set1TotalPages)} − ${formatCount(excludeTotalPages)})`}
        </Button>
      </div>

      <ProgressBanner progress={progress} />
    </Card>
  );
}
