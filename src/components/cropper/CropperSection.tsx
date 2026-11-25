import { processUploadedPdfs } from "@/services/pdf/cropProcessor";
import type {
  CropConfiguration,
  CropProcessResult,
  ProcessingProgress,
  UploadedPdfFile,
} from "@/types";
import { formatCount } from "@/utils/format";
import { Button, Card, useToast } from "@elsesourav/react-ui";
import { Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { PdfDropzone } from "../common/PdfDropzone";
import { ProgressBanner } from "../common/ProgressBanner";
import { PdfViewerModal } from "../viewer/PdfViewerModal";
import { CropSettingsPanel } from "./CropSettingsPanel";

interface CropperSectionProps {
  config: CropConfiguration;
  onUpdateConfig: (partial: Partial<CropConfiguration>) => void;
  onOpenCropAdjust: (previewFiles: UploadedPdfFile[]) => void;
  files: UploadedPdfFile[];
  onFilesChange: (nextFiles: UploadedPdfFile[]) => void;
}

export function CropperSection({
  config,
  onUpdateConfig,
  onOpenCropAdjust,
  files,
  onFilesChange,
}: CropperSectionProps) {
  const { addToast } = useToast();
  const [progress, setProgress] = useState<ProcessingProgress>({
    active: false,
    percent: 0,
    stage: "",
  });
  const [result, setResult] = useState<CropProcessResult | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const totalInputPages = useMemo(
    () => files.reduce((sum, f) => sum + f.pageCount, 0),
    [files],
  );

  const serialRangeBadge = useMemo(() => {
    if (!config.includeSerial || totalInputPages === 0) return undefined;
    const start = Math.max(1, config.startingSerial);
    const end = start + totalInputPages - 1;
    return `#${formatCount(start)}–#${formatCount(end)}`;
  }, [config.includeSerial, config.startingSerial, totalInputPages]);

  const handleProcess = async () => {
    if (files.length === 0) {
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
        files,
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
        <div className="lg:col-span-7">
          <PdfDropzone
            title="Upload PDFs"
            serialRangeBadge={serialRangeBadge}
            files={files}
            onFilesChange={onFilesChange}
            allowReorder
          />
        </div>

        <div className="space-y-3 lg:col-span-5">
          <CropSettingsPanel
            config={config}
            onUpdate={onUpdateConfig}
            onOpenCropAdjust={() => onOpenCropAdjust(files)}
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
                : files.length > 0
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
