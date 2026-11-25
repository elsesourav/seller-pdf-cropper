import type { useCompareWorkflow } from "@/hooks/useCompareWorkflow";
import type { CropConfiguration, UploadedPdfFile } from "@/types";
import { formatCount } from "@/utils/format";
import { Button } from "@elsesourav/react-ui";
import { ArrowLeftRight, FolderPlus } from "lucide-react";
import { useMemo } from "react";
import { PdfDropzone } from "../common/PdfDropzone";
import { PdfViewerModal } from "../viewer/PdfViewerModal";
import { CompareOptionsCard } from "./CompareOptionsCard";
import { CompareResultCard } from "./CompareResultCard";

interface CompareSectionProps {
  workflow: ReturnType<typeof useCompareWorkflow>;
  config: CropConfiguration;
  onUpdateConfig: (partial: Partial<CropConfiguration>) => void;
  onOpenCropAdjust: (previewFiles: UploadedPdfFile[]) => void;
}

export function CompareSection({
  workflow,
  config,
  onUpdateConfig,
  onOpenCropAdjust,
}: CompareSectionProps) {
  const { sets } = workflow;
  const primarySet = sets[0];
  const secondSet = sets[1];
  const extraExcludeSets = sets.slice(2);

  const primaryHashes = useMemo(
    () => new Set(primarySet.files.map((f) => f.hash)),
    [primarySet.files],
  );
  const allExcludeHashes = useMemo(() => {
    const out = new Set<string>();
    for (const bucket of sets.slice(1)) {
      for (const f of bucket.files) out.add(f.hash);
    }
    return out;
  }, [sets]);

  const set1TotalPages = useMemo(
    () => primarySet.files.reduce((s, f) => s + f.pageCount, 0),
    [primarySet.files],
  );
  const excludeTotalPages = useMemo(
    () =>
      sets
        .slice(1)
        .reduce(
          (sum, b) => sum + b.files.reduce((fs, f) => fs + f.pageCount, 0),
          0,
        ),
    [sets],
  );

  const canSwapPrimarySecond =
    primarySet.files.length > 0 || secondSet.files.length > 0;

  return (
    <div className="space-y-4">
      {/* Set 1 | Swap | Set 2 */}
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <PdfDropzone
          title={primarySet.label}
          files={primarySet.files}
          onFilesChange={(next) => workflow.updateSetFiles(primarySet.id, next)}
          overlappingHashes={allExcludeHashes}
          compact
        />

        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canSwapPrimarySecond}
            onClick={() => workflow.swapWithPrimary(1, false)}
            leftIcon={<ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />}
            className="w-full shrink-0 whitespace-nowrap border-primary/40 bg-surface-elevated font-semibold text-primary hover:border-primary hover:bg-primary/10 lg:w-auto"
            title="Swap Set 1 and Set 2"
          >
            Swap
          </Button>
        </div>

        <PdfDropzone
          title={secondSet.label}
          files={secondSet.files}
          onFilesChange={(next) => workflow.updateSetFiles(secondSet.id, next)}
          overlappingHashes={primaryHashes}
          compact
        />
      </div>

      {/* Additional Subtract Sets (Set 3..Set N) */}
      {extraExcludeSets.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {extraExcludeSets.map((bucket, idx) => {
            const setIdx = idx + 2;
            return (
              <PdfDropzone
                key={bucket.id}
                title={bucket.label}
                files={bucket.files}
                onFilesChange={(next) => workflow.updateSetFiles(bucket.id, next)}
                overlappingHashes={primaryHashes}
                onRemoveSet={() => workflow.removeExcludeSet(bucket.id)}
                headerAction={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => workflow.swapWithPrimary(setIdx, false)}
                    className="h-6 whitespace-nowrap px-2 text-[11px] font-semibold text-primary"
                    title={`Swap Set ${setIdx + 1} with Set 1`}
                  >
                    Make Set 1
                  </Button>
                }
                compact
              />
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<FolderPlus className="h-4 w-4 text-primary" />}
          onClick={workflow.addExcludeSet}
        >
          Add Subtract Set
        </Button>
        {sets.length > 2 && (
          <span className="font-mono text-xs text-muted-foreground">
            Set 1 − ({sets.slice(1).map((_, i) => `Set ${i + 2}`).join(" ∪ ")})
          </span>
        )}
      </div>

      <CompareOptionsCard
        config={config}
        onUpdateConfig={onUpdateConfig}
        onOpenCropAdjust={onOpenCropAdjust}
        set1Files={primarySet.files}
        set1TotalPages={set1TotalPages}
        excludeTotalPages={excludeTotalPages}
        matchingMethod={workflow.matchingMethod}
        onMatchingMethodChange={workflow.setMatchingMethod}
        deduplicateSet1={workflow.deduplicateSet1}
        onDeduplicateSet1Change={workflow.setDeduplicateSet1}
        applyCropOnCompare={workflow.applyCropOnCompare}
        onApplyCropOnCompareChange={workflow.setApplyCropOnCompare}
        progress={workflow.progress}
        canSwap={canSwapPrimarySecond}
        onRunCompare={() => void workflow.runCompare()}
        onSwapAndCompare={() => workflow.swapWithPrimary(1, true)}
      />

      {workflow.result && (
        <CompareResultCard
          result={workflow.result}
          filteredPages={workflow.filteredUniquePages}
          selectedCount={workflow.selectedUniquePages.length}
          isPageSelected={workflow.isPageSelected}
          searchQuery={workflow.searchQuery}
          onSearchQueryChange={workflow.setSearchQuery}
          onTogglePage={workflow.togglePageSelection}
          onSelectAll={workflow.selectAllPages}
          onClearAll={workflow.clearAllPages}
          onSwapAndRecompare={() => workflow.swapWithPrimary(1, true)}
          onExport={(cropOutput) => void workflow.exportSelectedPages(cropOutput)}
          isBusy={workflow.progress.active}
        />
      )}

      <PdfViewerModal
        open={workflow.viewerOpen}
        onClose={() => workflow.setViewerOpen(false)}
        blob={workflow.viewerBlob}
        fileName={workflow.viewerFileName}
        stats={
          workflow.result
            ? [
                {
                  label: "Set 1",
                  value: `${formatCount(workflow.result.set1TotalPages)}p`,
                },
                {
                  label: "Subtract",
                  value: `${formatCount(workflow.result.excludeTotalPages)}p`,
                },
                {
                  label: "Excluded",
                  value: `${formatCount(workflow.result.excludedCount)}p`,
                  tone: "warning",
                },
                {
                  label: "Output",
                  value: `${formatCount(
                    workflow.selectedUniquePages.length ||
                      workflow.result.uniquePages.length,
                  )}p`,
                  tone: "success",
                },
                ...(workflow.viewerIsCropped
                  ? [
                      {
                        label: "Mode",
                        value: `${config.documentType === "bill" ? "Bill" : "Label"} Cropped`,
                        tone: "primary" as const,
                      },
                    ]
                  : []),
                ...(workflow.viewerIsCropped &&
                workflow.result.serialStart !== undefined &&
                workflow.result.serialEnd !== undefined
                  ? [
                      {
                        label: "Serial",
                        value: `#${formatCount(workflow.result.serialStart)}–#${formatCount(workflow.result.serialEnd)}`,
                        tone: "primary" as const,
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </div>
  );
}
