import { renderPdfPagesToImages } from "@/services/pdf/preview";
import type { RenderedPageThumbnail } from "@/types";
import { formatCount, formatFileSize } from "@/utils/format";
import { Button, Modal, Spinner, useIsMobile } from "@elsesourav/react-ui";
import { Download, ExternalLink, FileCheck2, Scissors } from "lucide-react";
import { useEffect, useState } from "react";

interface PdfViewerModalProps {
  open: boolean;
  onClose: () => void;
  blob: Blob | null;
  fileName: string;
  extraAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function PdfViewerModal({
  open,
  onClose,
  blob,
  fileName,
  extraAction,
}: PdfViewerModalProps) {
  const isMobile = useIsMobile(768);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [renderedPages, setRenderedPages] = useState<RenderedPageThumbnail[]>([]);
  const [totalPdfPages, setTotalPdfPages] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState(false);

  useEffect(() => {
    if (!open || !blob) {
      setBlobUrl("");
      setRenderedPages([]);
      setTotalPdfPages(0);
      return;
    }

    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, blob]);

  useEffect(() => {
    if (!open || !blob || !isMobile || renderedPages.length > 0) {
      return;
    }

    let cancelled = false;
    setIsLoadingPages(true);

    renderPdfPagesToImages(blob, 1, 10, 1.25)
      .then((res) => {
        if (!cancelled) {
          setTotalPdfPages(res.totalPages);
          setRenderedPages(res.pages);
        }
      })
      .catch(() => {
        // Ignore mobile canvas fallback errors
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, blob, renderedPages.length, isMobile]);

  const handleLoadMorePages = async () => {
    if (!blob || isLoadingPages) return;
    const nextStart = renderedPages.length + 1;
    if (nextStart > totalPdfPages) return;

    setIsLoadingPages(true);
    try {
      const res = await renderPdfPagesToImages(blob, nextStart, 10, 1.25);
      setRenderedPages((prev) => [...prev, ...res.pages]);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <span className="truncate font-display text-sm font-bold sm:text-base">
            {fileName}
          </span>
        </div>
      }
      maxWidth="min(1260px, 98vw)"
      maxHeight="95dvh"
      className="flex h-[92dvh] flex-col sm:h-[95dvh]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            {blob && <span>{formatFileSize(blob.size)}</span>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
              onClick={handleOpenNewTab}
            >
              <span className="hidden sm:inline">Open Tab</span>
              <span className="sm:hidden">Open</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
            {extraAction ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={extraAction.disabled}
                leftIcon={<Scissors className="h-3.5 w-3.5" />}
                onClick={extraAction.onClick}
              >
                {extraAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-sunken/70">
          {!isMobile && blobUrl ? (
            <iframe
              src={blobUrl}
              title={fileName}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="custom-scrollbar h-full overflow-y-auto p-2">
              {renderedPages.length === 0 && isLoadingPages ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Spinner size="lg" />
                  <span className="text-xs text-muted-foreground">
                    Rendering pages...
                  </span>
                </div>
              ) : (
                <div className="mx-auto grid max-w-5xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {renderedPages.map((pg) => (
                    <div
                      key={pg.pageNumber}
                      className="w-full overflow-hidden rounded-lg border border-border bg-white shadow-lift"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 bg-surface-elevated px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                        <span>Page {pg.pageNumber}</span>
                        <span>/ {formatCount(totalPdfPages)}</span>
                      </div>
                      <img
                        src={pg.dataUrl}
                        alt={`Page ${pg.pageNumber}`}
                        className="mx-auto block h-auto w-full object-contain"
                      />
                    </div>
                  ))}

                  {renderedPages.length < totalPdfPages && (
                    <div className="flex justify-center py-1 sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isLoadingPages}
                        onClick={() => void handleLoadMorePages()}
                      >
                        Load More ({formatCount(totalPdfPages - renderedPages.length)})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
