import { useVirtualList } from "@/hooks/useVirtualList";
import type { ComparePageResult, CompareProcessResult } from "@/types";
import { formatCount } from "@/utils/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
} from "@elsesourav/react-ui";
import {
  CheckCheck,
  Eye,
  Scissors,
  Search,
  Trash2,
} from "lucide-react";

interface CompareResultCardProps {
  result: CompareProcessResult;
  filteredPages: ComparePageResult[];
  selectedCount: number;
  isPageSelected: (page: ComparePageResult) => boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onTogglePage: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onPreviewRaw: () => void;
  onMoveToCropper: () => void;
  isBusy: boolean;
}

const ROW_HEIGHT = 50;
const VIEWPORT_HEIGHT = 280;

export function CompareResultCard({
  result,
  filteredPages,
  selectedCount,
  isPageSelected,
  searchQuery,
  onSearchQueryChange,
  onTogglePage,
  onSelectAll,
  onClearAll,
  onPreviewRaw,
  onMoveToCropper,
  isBusy,
}: CompareResultCardProps) {
  const virtual = useVirtualList({
    totalCount: filteredPages.length,
    rowHeight: ROW_HEIGHT,
    containerHeight: VIEWPORT_HEIGHT,
    overscan: 6,
  });

  return (
    <Card
      variant="elevated"
      className="animate-ui-enter space-y-3 border-border/80 p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={result.uniquePages.length > 0 ? "success" : "warning"}
            size="sm"
            className="font-mono"
          >
            {formatCount(result.uniquePages.length)} unique
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            Excluded: {formatCount(result.excludedCount)}p
          </span>
        </div>

        {result.uniquePages.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
              onClick={onSelectAll}
            >
              All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onClearAll}
            >
              None
            </Button>
          </div>
        )}
      </div>

      {result.uniquePages.length === 0 ? (
        <Alert variant="info" title="No unique orders">
          All Order IDs in Set 1 matched Set 2.
        </Alert>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Input
                variant="standard"
                sizeVariant="sm"
                placeholder="Search Order ID..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {formatCount(selectedCount)} / {formatCount(result.uniquePages.length)}
            </span>
          </div>

          <div
            ref={virtual.scrollRef}
            onScroll={virtual.onScroll}
            style={{
              height: Math.min(
                VIEWPORT_HEIGHT,
                Math.max(ROW_HEIGHT, filteredPages.length * ROW_HEIGHT),
              ),
            }}
            className="custom-scrollbar relative overflow-y-auto pr-1"
          >
            {filteredPages.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No matches
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
                  {filteredPages
                    .slice(virtual.startIndex, virtual.endIndex + 1)
                    .map((page) => {
                      const selected = isPageSelected(page);
                      return (
                        <div
                          key={page.id}
                          style={{ height: ROW_HEIGHT - 6 }}
                          role="button"
                          tabIndex={0}
                          onClick={() => onTogglePage(page.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onTogglePage(page.id);
                            }
                          }}
                          className={`mb-1.5 flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 transition-colors select-none ${
                            selected
                              ? "border-primary/60 bg-primary/10"
                              : "border-border/80 bg-surface-subtle/40 hover:border-border-strong"
                          }`}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected}
                              onChange={() => onTogglePage(page.id)}
                            />
                          </div>

                          <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-foreground">
                            {page.orderId || `Page ${page.displayPageNumber}`}
                          </span>

                          <span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground">
                            p{page.displayPageNumber}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={!selectedCount || isBusy}
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={onPreviewRaw}
              className="whitespace-nowrap"
            >
              View PDF ({formatCount(selectedCount)}p)
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!selectedCount || isBusy}
              leftIcon={<Scissors className="h-4 w-4" />}
              onClick={onMoveToCropper}
              className="whitespace-nowrap"
            >
              Crop Label / Bill ({formatCount(selectedCount)}p)
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
