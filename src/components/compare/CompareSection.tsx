import type { useCompareWorkflow } from "@/hooks/useCompareWorkflow";
import type { CropConfiguration, UploadedPdfFile } from "@/types";
import { formatCount } from "@/utils/format";
import { Button } from "@elsesourav/react-ui";
import { ArrowLeftRight, FolderPlus } from "lucide-react";
import { useMemo } from "react";
import { PdfDropzone } from "../common/PdfDropzone";
import { PdfViewerModal } from "../viewer/PdfViewerModal";
import { CompareFormulaBanner } from "./CompareFormulaBanner";
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
      <CompareFormulaBanner sets={sets} />

      {/* Set 1 | Switch | Set 2 */}
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <PdfDropzone
          title={primarySet.label}
          subtitle="Upload 1 to 10,000+ PDFs for the primary set"
          badgeText="① SET 1"
          badgeVariant="primary"
          files={primarySet.files}
          onFilesChange={(next) => workflow.updateSetFiles(primarySet.id, next)}
          overlappingHashes={allExcludeHashes}
          compact
        />

        <div className="flex items-center justify-center py-0.5 lg:flex-col lg:px-1">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={!canSwapPrimarySecond}
            onClick={() => workflow.swapWithPrimary(1, false)}
            className="w-full flex-row gap-2 border-primary/40 bg-surface-elevated font-bold text-primary shadow-lift hover:border-primary hover:bg-primary/10 lg:h-full lg:max-h-36 lg:w-auto lg:flex-col lg:px-3"
            title="Switch Set 1 and Set 2"
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            <span className="text-xs">Switch ① ⇄ ②</span>
          </Button>
        </div>

        <PdfDropzone
          title={secondSet.label}
          subtitle="Upload 1 to 10,000+ PDFs to subtract from Set 1"
          badgeText="② SET 2"
          badgeVariant="warning"
          files={secondSet.files}
          onFilesChange={(next) => workflow.updateSetFiles(secondSet.id, next)}
          overlappingHashes={primaryHashes}
          compact
        />
      </div>

      {/* Additional Exclude Sets (Set 3..Set N) */}
      {extraExcludeSets.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {extraExcludeSets.map((bucket, idx) => {
            const setIdx = idx + 2;
            return (
              <PdfDropzone
                key={bucket.id}
                title={bucket.label}
                subtitle="Additional subtract set (excluded from Set 1)"
                badgeText={`SET ${setIdx + 1}`}
                badgeVariant="warning"
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
                    className="h-6 px-2 text-[11px] font-semibold text-primary"
                    title={`Make Set ${setIdx + 1} the Primary Set 1`}
                  >
                    <ArrowLeftRight className="mr-1 h-3 w-3" />
                    Make ①
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
          Add Subtract Set ({sets.length + 1})
        </Button>
        {sets.length > 2 && (
          <span className="font-mono text-xs text-muted-foreground">
            {sets.length} sets active
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
