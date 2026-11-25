import {
  buildChunkFileName,
  buildPdfChunkRanges,
  extractPdfChunkBlob,
  loadPdfDocumentFromBlob,
  triggerBlobDownload,
  type PdfChunkRange,
} from "@/services/pdf/pdfChunks";
import { renderPdfPagesToImages } from "@/services/pdf/preview";
import type { RenderedPageThumbnail } from "@/types";
import { formatCount, formatFileSize } from "@/utils/format";
import {
  Button,
  Dropdown,
  Modal,
  Spinner,
  useIsMobile,
  type DropdownItem,
} from "@elsesourav/react-ui";
import { Download, ExternalLink, FileCheck2, Scissors } from "lucide-react";
import type { PDFDocument } from "pdf-lib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChunkOption = "all" | "50" | "100" | "200" | "500";

const CHUNK_OPTIONS: DropdownItem[] = [
  { value: "all", label: "All" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
  { value: "200", label: "200" },
  { value: "500", label: "500" },
];

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
  const [chunkSize, setChunkSize] = useState<ChunkOption>("all");
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [totalSourcePages, setTotalSourcePages] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const [displayBlob, setDisplayBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [renderedPages, setRenderedPages] = useState<RenderedPageThumbnail[]>([]);
  const [totalPdfPages, setTotalPdfPages] = useState<number>(0);
  const [isLoadingPages, setIsLoadingPages] = useState(false);

  const sourceDocRef = useRef<PDFDocument | null>(null);
  const chunkCacheRef = useRef<Map<string, Blob>>(new Map());

  // Reset split selection cleanly whenever modal opens with a new PDF
  useEffect(() => {
    sourceDocRef.current = null;
    chunkCacheRef.current.clear();
    setChunkSize("all");
    setActiveChunkIndex(0);
    setTotalSourcePages(0);

    if (!open || !blob) {
      setDisplayBlob(null);
      setRenderedPages([]);
      setTotalPdfPages(0);
      return;
    }

    let cancelled = false;
    setDisplayBlob(blob);

    loadPdfDocumentFromBlob(blob)
      .then((doc) => {
        if (cancelled) return;
        sourceDocRef.current = doc;
        setTotalSourcePages(doc.getPageCount());
      })
      .catch(() => {
        // Fallback when page count metadata cannot be preloaded
      });

    return () => {
      cancelled = true;
    };
  }, [open, blob]);

  const chunkRanges = useMemo<PdfChunkRange[]>(() => {
    if (chunkSize === "all" || totalSourcePages <= 0) return [];
    return buildPdfChunkRanges(totalSourcePages, Number(chunkSize));
  }, [chunkSize, totalSourcePages]);

  const activeChunk = chunkRanges[activeChunkIndex] || null;

  // Build / retrieve only the active chunk PDF on demand so 10,000+ pages stay fast
  useEffect(() => {
    if (!open || !blob) return;

    if (chunkSize === "all" || !activeChunk) {
      setDisplayBlob(blob);
      setIsSplitting(false);
      return;
    }

    const cacheKey = `${chunkSize}:${activeChunk.index}`;
    const cached = chunkCacheRef.current.get(cacheKey);
    if (cached) {
      setDisplayBlob(cached);
      setIsSplitting(false);
      return;
    }

    let cancelled = false;
    setIsSplitting(true);

    const resolveChunk = async () => {
      const doc = sourceDocRef.current || (await loadPdfDocumentFromBlob(blob));
      sourceDocRef.current = doc;
      return extractPdfChunkBlob(doc, activeChunk.startPage, activeChunk.endPage);
    };

    resolveChunk()
      .then((chunkBlob) => {
        if (cancelled) return;
        chunkCacheRef.current.set(cacheKey, chunkBlob);
        setDisplayBlob(chunkBlob);
      })
      .finally(() => {
        if (!cancelled) setIsSplitting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, blob, chunkSize, activeChunk]);

  // Update object URL whenever active PDF (full or chunk) changes
  useEffect(() => {
    if (!open || !displayBlob) {
      setBlobUrl("");
      return;
    }
    const url = URL.createObjectURL(displayBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, displayBlob]);

  // Mobile canvas rendering of active PDF (full or active chunk)
  useEffect(() => {
    if (!open || !displayBlob || !isMobile) {
      if (!isMobile) setRenderedPages([]);
      return;
    }

    let cancelled = false;
    setRenderedPages([]);
    setTotalPdfPages(0);
    setIsLoadingPages(true);

    renderPdfPagesToImages(displayBlob, 1, 10, 1.25)
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
  }, [open, displayBlob, isMobile]);

  const handleLoadMorePages = async () => {
    if (!displayBlob || isLoadingPages) return;
    const nextStart = renderedPages.length + 1;
    if (nextStart > totalPdfPages) return;

    setIsLoadingPages(true);
    try {
      const res = await renderPdfPagesToImages(displayBlob, nextStart, 10, 1.25);
      setRenderedPages((prev) => [...prev, ...res.pages]);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const activeFileName = useMemo(() => {
    if (!activeChunk) return fileName;
    return buildChunkFileName(fileName, activeChunk.startPage, activeChunk.endPage);
  }, [activeChunk, fileName]);

  const handleDownload = useCallback(() => {
    if (!displayBlob) return;
    triggerBlobDownload(displayBlob, activeFileName);
  }, [activeFileName, displayBlob]);

  const handleDownloadAllChunks = useCallback(async () => {
    if (!blob || chunkRanges.length < 2 || isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      const doc = sourceDocRef.current || (await loadPdfDocumentFromBlob(blob));
      sourceDocRef.current = doc;

      for (const chunk of chunkRanges) {
        const key = `${chunkSize}:${chunk.index}`;
        let partBlob = chunkCacheRef.current.get(key);
        if (!partBlob) {
          partBlob = await extractPdfChunkBlob(doc, chunk.startPage, chunk.endPage);
          chunkCacheRef.current.set(key, partBlob);
        }
        triggerBlobDownload(
          partBlob,
          buildChunkFileName(fileName, chunk.startPage, chunk.endPage),
        );
        await new Promise((r) => setTimeout(r, 180));
      }
    } finally {
      setIsDownloadingAll(false);
    }
  }, [blob, chunkRanges, chunkSize, fileName, isDownloadingAll]);

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
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <span className="truncate font-display text-sm font-bold sm:text-base">
              {activeFileName}
            </span>
          </div>

          {blob && (
            <div className="shrink-0 [&_button]:h-8 [&_button]:px-2.5 [&_button]:text-xs">
              <Dropdown
                aria-label="Chunk size"
                value={chunkSize}
                onChange={(val) => {
                  setChunkSize(val as ChunkOption);
                  setActiveChunkIndex(0);
                }}
                items={CHUNK_OPTIONS}
              />
            </div>
          )}
        </div>
      }
      maxWidth="min(1260px, 98vw)"
      maxHeight="95dvh"
      className="flex h-[92dvh] flex-col sm:h-[95dvh]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            {displayBlob && <span>{formatFileSize(displayBlob.size)}</span>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!blobUrl || isSplitting}
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
              disabled={!displayBlob || isSplitting}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
            {chunkRanges.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={isDownloadingAll}
                disabled={isDownloadingAll}
                leftIcon={isDownloadingAll ? undefined : <Download className="h-3.5 w-3.5" />}
                onClick={() => void handleDownloadAllChunks()}
              >
                All ({chunkRanges.length})
              </Button>
            )}
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
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        {chunkRanges.length > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chunkRanges.map((chunk) => {
              const isActive = chunk.index === activeChunkIndex;
              return (
                <button
                  key={chunk.index}
                  type="button"
                  onClick={() => setActiveChunkIndex(chunk.index)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/80 bg-surface-elevated text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {chunk.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-sunken/70">
          {isSplitting ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <Spinner size="lg" />
            </div>
          ) : !isMobile && blobUrl ? (
            <iframe
              src={blobUrl}
              title={activeFileName}
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
