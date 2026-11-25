import type { useCompareWorkflow } from "@/hooks/useCompareWorkflow";
import type { UploadedPdfFile } from "@/types";
import { formatCount } from "@/utils/format";
import { Button, useToast } from "@elsesourav/react-ui";
import { ArrowLeftRight } from "lucide-react";
import { useMemo } from "react";
import { PdfDropzone } from "../common/PdfDropzone";
import { PdfViewerModal } from "../viewer/PdfViewerModal";
import { CompareOptionsCard } from "./CompareOptionsCard";
import { CompareResultCard } from "./CompareResultCard";

interface CompareSectionProps {
  workflow: ReturnType<typeof useCompareWorkflow>;
  onMoveOutputToCropper: (file: UploadedPdfFile) => void;
}

export function CompareSection({
  workflow,
  onMoveOutputToCropper,
}: CompareSectionProps) {
  const { addToast } = useToast();
  const { sets } = workflow;
  const primarySet = sets[0];
  const secondSet = sets[1];

  const primaryHashes = useMemo(
    () => new Set(primarySet.files.map((f) => f.hash)),
    [primarySet.files],
  );
  const secondHashes = useMemo(
    () => new Set(secondSet.files.map((f) => f.hash)),
    [secondSet.files],
  );

  const set1TotalPages = useMemo(
    () => primarySet.files.reduce((s, f) => s + f.pageCount, 0),
    [primarySet.files],
  );
  const set2TotalPages = useMemo(
    () => secondSet.files.reduce((s, f) => s + f.pageCount, 0),
    [secondSet.files],
  );

  const canSwitch = primarySet.files.length > 0 || secondSet.files.length > 0;

  const handleMoveToCropper = async () => {
    const outputFile = await workflow.createCropperInputFile();
    if (!outputFile) return;
    onMoveOutputToCropper(outputFile);
    addToast({
      type: "success",
      title: "Sent to PDF Cropper",
      description: `Loaded ${formatCount(outputFile.pageCount)} pages into PDF Cropper.`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <PdfDropzone
          title={primarySet.label}
          files={primarySet.files}
          onFilesChange={(next) => workflow.updateSetFiles(primarySet.id, next)}
          overlappingHashes={secondHashes}
          compact
        />

        <div className="flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canSwitch}
            onClick={workflow.swapSets}
            leftIcon={<ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />}
            className="w-full shrink-0 whitespace-nowrap border-primary/40 bg-surface-elevated font-semibold text-primary hover:border-primary hover:bg-primary/10 lg:w-auto"
            title="Switch Set 1 and Set 2"
          >
            Switch
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

      <CompareOptionsCard
        set1TotalPages={set1TotalPages}
        excludeTotalPages={set2TotalPages}
        deduplicateSet1={workflow.deduplicateSet1}
        onDeduplicateSet1Change={workflow.setDeduplicateSet1}
        progress={workflow.progress}
        onRunCompare={() => void workflow.runCompare()}
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
          onPreviewRaw={() => void workflow.previewRawOutput()}
          onMoveToCropper={() => void handleMoveToCropper()}
          isBusy={workflow.progress.active}
        />
      )}

      <PdfViewerModal
        open={workflow.viewerOpen}
        onClose={() => workflow.setViewerOpen(false)}
        blob={workflow.viewerBlob}
        fileName={workflow.viewerFileName}
        extraAction={
          workflow.selectedUniquePages.length > 0
            ? {
                label: "Crop Label / Bill",
                onClick: () => void handleMoveToCropper(),
                disabled: workflow.progress.active,
              }
            : undefined
        }
      />
    </div>
  );
}
