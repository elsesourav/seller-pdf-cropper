import { useVirtualList } from "@/hooks/useVirtualList";
import { inspectAndFilterPdfFiles } from "@/services/pdf/fileInspection";
import type {
  BadgeTone,
  UploadInspectProgress,
  UploadedPdfFile,
} from "@/types";
import { formatCount, formatFileSize } from "@/utils/format";
import { Badge, Button, Card, Input, Spinner, useToast } from "@elsesourav/react-ui";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  FolderPlus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

interface PdfDropzoneProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: BadgeTone;
  serialRangeBadge?: string;
  files: UploadedPdfFile[];
  onFilesChange: (nextFiles: UploadedPdfFile[]) => void;
  allowReorder?: boolean;
  overlappingHashes?: Set<string>;
  compact?: boolean;
  onRemoveSet?: () => void;
  headerAction?: React.ReactNode;
}

const FILE_ROW_HEIGHT = 60;
const LIST_VIEWPORT_HEIGHT = 240;

export function PdfDropzone({
  title,
  subtitle,
  badgeText,
  badgeVariant = "primary",
  serialRangeBadge,
  files,
  onFilesChange,
  allowReorder = false,
  overlappingHashes,
  compact = false,
  onRemoveSet,
  headerAction,
}: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inspectProgress, setInspectProgress] =
    useState<UploadInspectProgress | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const { addToast } = useToast();

  const totalPages = useMemo(
    () => files.reduce((sum, f) => sum + f.pageCount, 0),
    [files],
  );

  const filteredFiles = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, filterQuery]);

  const virtual = useVirtualList({
    totalCount: filteredFiles.length,
    rowHeight: FILE_ROW_HEIGHT,
    containerHeight: LIST_VIEWPORT_HEIGHT,
    overscan: 6,
  });

  const handleIncoming = useCallback(
    async (incoming: FileList | File[] | null) => {
      if (!incoming || incoming.length === 0) return;
      const list = Array.from(incoming);

      setInspectProgress({ processed: 0, total: list.length, currentFileName: "" });
      try {
        const result = await inspectAndFilterPdfFiles(
          list,
          files,
          (progress) => setInspectProgress(progress),
        );

        if (result.added.length > 0) {
          onFilesChange([...files, ...result.added]);
        }

        if (result.duplicates.length > 0) {
          addToast({
            type: "warning",
            title: "Duplicate PDF Skipped",
            description:
              result.duplicates.length === 1
                ? `"${result.duplicates[0]}" is already uploaded in this list.`
                : `Skipped ${formatCount(result.duplicates.length)} duplicate PDFs already in this list.`,
          });
        }

        if (result.invalid.length > 0) {
          addToast({
            type: "error",
            title: "Unsupported File",
            description:
              result.invalid.length === 1
                ? `"${result.invalid[0]}" is not a valid PDF.`
                : `Skipped ${formatCount(result.invalid.length)} invalid or non-PDF files.`,
          });
        }
      } finally {
        setInspectProgress(null);
      }
    },
    [addToast, files, onFilesChange],
  );

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    onFilesChange(next);
  };

  const handleRemove = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <Card
      variant="default"
      className="flex flex-col overflow-hidden border-border/80 bg-card/95 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          {badgeText && (
            <Badge variant={badgeVariant} size="sm" className="shrink-0 font-mono font-bold">
              {badgeText}
            </Badge>
          )}
          <h3 className="truncate font-display text-sm font-bold text-foreground">
            {title}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {serialRangeBadge && (
            <Badge variant="success" size="sm" className="font-mono text-[11px]">
              {serialRangeBadge}
            </Badge>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {formatCount(files.length)}f • {formatCount(totalPages)}p
          </span>
          {headerAction}
          {files.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                setFilterQuery("");
                onFilesChange([]);
              }}
              className="h-6 px-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Clear files"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRemoveSet && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onRemoveSet}
              className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
              title="Remove set"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Dropzone */}
      <div className={compact ? "p-3" : "p-3.5 sm:p-4"}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleIncoming(e.target.files);
            e.target.value = "";
          }}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            void handleIncoming(e.dataTransfer.files);
          }}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 focus:outline-none ${
            compact ? "px-3 py-3.5" : "px-4 py-5"
          } ${
            isDragging
              ? "border-primary bg-primary/10 scale-[0.995]"
              : "border-border-strong/70 bg-surface-subtle/50 hover:border-primary/60 hover:bg-primary/5"
          }`}
        >
          {inspectProgress ? (
            <div className="flex w-full max-w-xs flex-col items-center gap-2 text-center">
              <Spinner size="md" />
              <span className="text-xs font-semibold text-foreground">
                Inspecting {formatCount(inspectProgress.processed)} /{" "}
                {formatCount(inspectProgress.total)}
              </span>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150"
                  style={{
                    width: `${
                      inspectProgress.total > 0
                        ? Math.round(
                            (inspectProgress.processed / inspectProgress.total) * 100,
                          )
                        : 10
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  isDragging
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-elevated text-primary shadow-lift group-hover:border-primary/40"
                }`}
              >
                {files.length > 0 ? (
                  <FolderPlus className="h-4 w-4" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
              </div>
              <p className="text-center text-xs font-semibold text-foreground sm:text-sm">
                {files.length > 0 ? "Add PDFs" : "Drop or choose PDFs"}
              </p>
              {subtitle && (
                <p className="mt-0.5 text-center text-[11px] text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </>
          )}
        </div>

        {/* Virtualized File List */}
        {files.length > 0 && (
          <div className="mt-2.5 space-y-2">
            {files.length > 10 && (
              <Input
                variant="standard"
                sizeVariant="sm"
                placeholder={`Filter ${formatCount(files.length)} files...`}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            )}

            <div
              ref={virtual.scrollRef}
              onScroll={virtual.onScroll}
              style={{
                height: Math.min(
                  LIST_VIEWPORT_HEIGHT,
                  Math.max(FILE_ROW_HEIGHT, filteredFiles.length * FILE_ROW_HEIGHT),
                ),
              }}
              className="custom-scrollbar relative overflow-y-auto pr-1"
            >
              {filteredFiles.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No matching files
                </p>
              ) : (
                <div style={{ height: virtual.totalHeight, position: "relative" }}>
                  <div
                    style={{
                      transform: `translateY(${virtual.offsetTop}px)`,
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                    }}
                  >
                    {filteredFiles
                      .slice(virtual.startIndex, virtual.endIndex + 1)
                      .map((item, sliceIdx) => {
                        const actualIndex = virtual.startIndex + sliceIdx;
                        const isSharedAcrossSets = overlappingHashes?.has(item.hash);
                        return (
                          <div
                            key={item.id}
                            style={{ height: FILE_ROW_HEIGHT - 6 }}
                            className="mb-1.5 flex items-center gap-2 rounded-xl border border-border/80 bg-surface-elevated/70 px-2.5 transition-colors hover:border-border-strong"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p
                                  className="truncate text-xs font-semibold text-foreground sm:text-sm"
                                  title={item.name}
                                >
                                  {item.name}
                                </p>
                                {isSharedAcrossSets && (
                                  <span
                                    className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning"
                                    title="Same file also exists in another set"
                                  >
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Overlap
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                                <span>{item.pageCount}p</span>
                                <span>•</span>
                                <span>{formatFileSize(item.size)}</span>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {allowReorder && !filterQuery && files.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    disabled={actualIndex === 0}
                                    onClick={() => handleMove(actualIndex, -1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-surface text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                                    title="Move up"
                                    aria-label={`Move ${item.name} up`}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actualIndex === files.length - 1}
                                    onClick={() => handleMove(actualIndex, 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-surface text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                                    title="Move down"
                                    aria-label={`Move ${item.name} down`}
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemove(item.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                title="Remove file"
                                aria-label={`Remove ${item.name}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
