import { MATCH_METHOD_ITEMS } from "@/constants/matching";
import type {
  CropConfiguration,
  MatchingMethod,
  ProcessingProgress,
  UploadedPdfFile,
} from "@/types";
import { formatCount } from "@/utils/format";
import { Button, Card, Select, SquishSwitch } from "@elsesourav/react-ui";
import { ArrowLeftRight, Crop, GitCompareArrows } from "lucide-react";
import { ProgressBanner } from "../common/ProgressBanner";
import { CropSettingsPanel } from "../cropper/CropSettingsPanel";

interface CompareOptionsCardProps {
  config: CropConfiguration;
  onUpdateConfig: (partial: Partial<CropConfiguration>) => void;
  onOpenCropAdjust: (previewFiles: UploadedPdfFile[]) => void;
  set1Files: UploadedPdfFile[];
  set1TotalPages: number;
  excludeTotalPages: number;
  matchingMethod: MatchingMethod;
  onMatchingMethodChange: (method: MatchingMethod) => void;
  deduplicateSet1: boolean;
  onDeduplicateSet1Change: (value: boolean) => void;
  applyCropOnCompare: boolean;
  onApplyCropOnCompareChange: (value: boolean) => void;
  progress: ProcessingProgress;
  canSwap: boolean;
  onRunCompare: () => void;
  onSwapAndCompare: () => void;
}

export function CompareOptionsCard({
  config,
  onUpdateConfig,
  onOpenCropAdjust,
  set1Files,
  set1TotalPages,
  excludeTotalPages,
  matchingMethod,
  onMatchingMethodChange,
  deduplicateSet1,
  onDeduplicateSet1Change,
  applyCropOnCompare,
  onApplyCropOnCompareChange,
  progress,
  canSwap,
  onRunCompare,
  onSwapAndCompare,
}: CompareOptionsCardProps) {
  return (
    <Card variant="default" className="space-y-3 border-border/80 bg-card/95 p-3.5 sm:p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center">
        <div className="space-y-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Matching Method
          </span>
          <Select
            variant="animated"
            items={MATCH_METHOD_ITEMS}
            value={matchingMethod}
            onChange={(val) => onMatchingMethodChange(val as MatchingMethod)}
            fullWidth
          />
        </div>

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
          className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-subtle/50 px-3 py-2.5 select-none"
        >
          <div>
            <p className="text-xs font-bold text-foreground">Deduplicate Set 1</p>
            <p className="text-[11px] text-muted-foreground">
              Remove repeated pages inside Set 1
            </p>
          </div>
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

        <div
          role="button"
          tabIndex={0}
          onClick={() => onApplyCropOnCompareChange(!applyCropOnCompare)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onApplyCropOnCompareChange(!applyCropOnCompare);
            }
          }}
          className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-subtle/50 px-3 py-2.5 select-none"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">
              Crop &amp; Add Serial
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {config.documentType === "bill" ? "Bill" : "Label"} •{" "}
              {config.includeSerial
                ? `#${formatCount(config.startingSerial)}+ (${config.serialFontSize}pt)`
                : "No serial"}
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenCropAdjust(set1Files)}
              className="rounded-lg border border-border bg-surface-elevated p-1.5 text-primary transition-colors hover:border-primary/50"
              title="Adjust crop area"
              aria-label="Adjust crop area"
            >
              <Crop className="h-3.5 w-3.5" />
            </button>
            <SquishSwitch
              checked={applyCropOnCompare}
              onChange={onApplyCropOnCompareChange}
              size="sm"
              variant="primary"
              ariaLabel="Crop and number compare output"
            />
          </div>
        </div>
      </div>

      {applyCropOnCompare && (
        <div className="border-t border-border/70 pt-3">
          <CropSettingsPanel
            config={config}
            onUpdate={onUpdateConfig}
            onOpenCropAdjust={() => onOpenCropAdjust(set1Files)}
            isCompareOutputMode
          />
        </div>
      )}

      <ProgressBanner progress={progress} />

      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="flex-1 font-bold"
        >
          {progress.active
            ? "Comparing PDFs..."
            : `Compare PDFs (${formatCount(set1TotalPages)}p − ${formatCount(excludeTotalPages)}p)`}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={progress.active || !canSwap}
          leftIcon={<ArrowLeftRight className="h-4 w-4" />}
          onClick={onSwapAndCompare}
          className="sm:w-auto"
        >
          Switch &amp; Compare
        </Button>
      </div>
    </Card>
  );
}
