import { processUploadedPdfs } from "@/services/pdf/cropProcessor";
import type {
  CropConfiguration,
  CropProcessResult,
  CropSetGroup,
  ProcessingProgress,
  UploadedPdfFile,
} from "@/types";
import { formatCount } from "@/utils/format";
import { Button, Card, useToast } from "@elsesourav/react-ui";
import { ArrowDown, ArrowUp, FolderPlus, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PdfDropzone } from "../common/PdfDropzone";
import { ProgressBanner } from "../common/ProgressBanner";
import { PdfViewerModal } from "../viewer/PdfViewerModal";
import { CropSettingsPanel } from "./CropSettingsPanel";

interface CropperSectionProps {
  config: CropConfiguration;
  onUpdateConfig: (partial: Partial<CropConfiguration>) => void;
  onOpenCropAdjust: (previewFiles: UploadedPdfFile[]) => void;
  sets: CropSetGroup[];
  onSetsChange: (nextSets: CropSetGroup[]) => void;
}

export function CropperSection({
  config,
  onUpdateConfig,
  onOpenCropAdjust,
  sets,
  onSetsChange,
}: CropperSectionProps) {
  const { addToast } = useToast();
  const [progress, setProgress] = useState<ProcessingProgress>({
    active: false,
    percent: 0,
    stage: "",
  });
  const [result, setResult] = useState<CropProcessResult | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const allFiles = useMemo(() => sets.flatMap((s) => s.files), [sets]);
  const totalInputPages = useMemo(
    () => allFiles.reduce((sum, f) => sum + f.pageCount, 0),
    [allFiles],
  );

  // Precompute continuous serial ranges per set when Serial Number is active
  const serialRangesBySetId = useMemo(() => {
    const map = new Map<string, string>();
    if (!config.includeSerial) return map;
    let cursor = Math.max(1, config.startingSerial);
    for (const s of sets) {
      const setPages = s.files.reduce((sum, f) => sum + f.pageCount, 0);
      if (setPages > 0) {
        const end = cursor + setPages - 1;
        map.set(s.id, `#${formatCount(cursor)}–#${formatCount(end)}`);
        cursor = end + 1;
      }
    }
    return map;
  }, [config.includeSerial, config.startingSerial, sets]);

  const handleSetFilesChange = (setId: string, files: UploadedPdfFile[]) => {
    onSetsChange(sets.map((s) => (s.id === setId ? { ...s, files } : s)));
  };

  const handleAddSet = () => {
    const nextNum = sets.length + 1;
    onSetsChange([
      ...sets,
      {
        id: `crop-set-${Date.now()}-${nextNum}`,
        label: `PDF Set ${nextNum}`,
        files: [],
      },
    ]);
  };

  const handleRemoveSet = (setId: string) => {
    if (sets.length <= 1) return;
    const next = sets
      .filter((s) => s.id !== setId)
      .map((s, idx) => ({ ...s, label: `PDF Set ${idx + 1}` }));
    onSetsChange(next);
  };

  const handleMoveSet = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sets.length) return;
    const next = [...sets];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onSetsChange(next.map((s, idx) => ({ ...s, label: `PDF Set ${idx + 1}` })));
  };

  const handleProcess = async () => {
    if (allFiles.length === 0) {
      addToast({
        type: "warning",
        title: "No PDF Selected",
        description: "Please upload at least one PDF file first.",
      });
      return;
    }

    setProgress({ active: true, percent: 2, stage: "Starting PDF processing..." });

    try {
      const output = await processUploadedPdfs({
        files: allFiles,
        config,
        onProgress: (percent, stage) =>
          setProgress({ active: true, percent, stage }),
      });

      setResult(output);
      setViewerOpen(true);

      const skippedMsg =
        output.duplicatePagesSkipped > 0
          ? ` • Skipped ${formatCount(output.duplicatePagesSkipped)} duplicate pages`
          : "";

      addToast({
        type: "success",
        title: "PDF Cropped Successfully",
        description: `Processed ${formatCount(output.outputPages)} pages${skippedMsg}.`,
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Processing Failed",
        description:
          error instanceof Error ? error.message : "Could not process the PDF files.",
      });
    } finally {
      setProgress({ active: false, percent: 0, stage: "" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        {/* Left: N Sets of Multi-PDF Uploaders */}
        <div className="space-y-3 lg:col-span-7">
          {sets.map((group, idx) => (
            <PdfDropzone
              key={group.id}
              title={sets.length === 1 ? "Upload PDFs" : group.label}
              badgeText={sets.length > 1 ? `SET ${idx + 1}` : undefined}
              badgeVariant="primary"
              serialRangeBadge={serialRangesBySetId.get(group.id)}
              files={group.files}
              onFilesChange={(next) => handleSetFilesChange(group.id, next)}
              allowReorder
              onRemoveSet={sets.length > 1 ? () => handleRemoveSet(group.id) : undefined}
              headerAction={
                sets.length > 1 ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSet(idx, -1)}
                      className="rounded-md border border-border/70 p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move set up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sets.length - 1}
                      onClick={() => handleMoveSet(idx, 1)}
                      className="rounded-md border border-border/70 p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move set down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<FolderPlus className="h-4 w-4 text-primary" />}
              onClick={handleAddSet}
            >
              Add Set
            </Button>

            {sets.length > 1 && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatCount(allFiles.length)}f • {formatCount(totalInputPages)}p
              </span>
            )}
          </div>
        </div>

        {/* Right: Crop & Serial Config + Action */}
        <div className="space-y-3 lg:col-span-5">
          <CropSettingsPanel
            config={config}
            onUpdate={onUpdateConfig}
            onOpenCropAdjust={() => onOpenCropAdjust(allFiles)}
            totalOutputPagesPreview={totalInputPages}
          />

          <Card variant="elevated" className="space-y-3 border-border/80 p-3.5 sm:p-4">
            <ProgressBanner progress={progress} />

            <Button
              type="button"
              variant="primary"
              size="lg"
              isLoading={progress.active}
              disabled={progress.active}
              leftIcon={progress.active ? undefined : <Play className="h-4 w-4" />}
              onClick={() => void handleProcess()}
              className="w-full font-bold"
            >
              {progress.active
                ? "Processing..."
                : allFiles.length > 0
                  ? `Crop PDF (${formatCount(totalInputPages)}p)`
                  : "Crop PDF"}
            </Button>

            {result && !progress.active && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-success" />}
                onClick={() => setViewerOpen(true)}
                className="w-full"
              >
                Open Output ({formatCount(result.outputPages)}p)
              </Button>
            )}
          </Card>
        </div>
      </div>

      <PdfViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        blob={result?.blob || null}
        fileName={result?.fileName || "cropped.pdf"}
        duplicateDetails={result?.duplicateDetails || []}
        stats={
          result
            ? [
                { label: "Files", value: formatCount(result.inputFileCount) },
                { label: "Input", value: `${formatCount(result.totalInputPages)}p` },
                ...(result.duplicatePagesSkipped > 0
                  ? [
                      {
                        label: "Duplicates Skipped",
                        value: formatCount(result.duplicatePagesSkipped),
                        tone: "warning" as const,
                      },
                    ]
                  : []),
                {
                  label: "Output",
                  value: `${formatCount(result.outputPages)}p`,
                  tone: "success",
                },
                ...(result.serialStart !== undefined && result.serialEnd !== undefined
                  ? [
                      {
                        label: "Serial",
                        value: `#${formatCount(result.serialStart)}–#${formatCount(result.serialEnd)}`,
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
