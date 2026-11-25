import {
  buildPdfFromSelectedPages,
  comparePdfSets,
} from "@/services/pdf/compareEngine";
import type {
  ComparePageResult,
  CompareProcessResult,
  CompareSetBucket,
  MatchingMethod,
  ProcessingProgress,
  UploadedPdfFile,
} from "@/types";
import { computeBytesHash } from "@/utils/hash";
import { useToast } from "@elsesourav/react-ui";
import { useCallback, useMemo, useState } from "react";

function createInitialSets(): CompareSetBucket[] {
  return [
    { id: "set-1", label: "Set 1", files: [] },
    { id: "set-2", label: "Set 2", files: [] },
  ];
}

export function useCompareWorkflow() {
  const { addToast } = useToast();

  const [sets, setSets] = useState<CompareSetBucket[]>(createInitialSets);
  const [matchingMethod, setMatchingMethod] = useState<MatchingMethod>("smart");
  const [deduplicateSet1, setDeduplicateSet1] = useState(true);

  const [progress, setProgress] = useState<ProcessingProgress>({
    active: false,
    percent: 0,
    stage: "",
  });

  const [result, setResult] = useState<CompareProcessResult | null>(null);
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerBlob, setViewerBlob] = useState<Blob | null>(null);
  const [viewerFileName, setViewerFileName] = useState("");

  const updateSetFiles = useCallback((setId: string, files: UploadedPdfFile[]) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, files } : s)),
    );
    setResult(null);
    setDeselectedIds(new Set());
  }, []);

  const runCompare = useCallback(
    async (targetSets: CompareSetBucket[] = sets) => {
      const primarySet = targetSets[0];
      const excludeSets = targetSets.slice(1);
      const excludeFilesCount = excludeSets.reduce(
        (sum, s) => sum + s.files.length,
        0,
      );

      if (!primarySet || primarySet.files.length === 0) {
        addToast({
          type: "warning",
          title: "Set 1 is Empty",
          description: "Upload at least one PDF in Set 1.",
        });
        return;
      }

      if (excludeFilesCount === 0) {
        addToast({
          type: "warning",
          title: "Set 2 is Empty",
          description: "Upload at least one PDF in Set 2.",
        });
        return;
      }

      setProgress({ active: true, percent: 2, stage: "Comparing PDFs..." });

      try {
        const res = await comparePdfSets({
          primarySet,
          excludeSets,
          matchingMethod,
          deduplicateSet1,
          onProgress: (percent, stage) =>
            setProgress({ active: true, percent, stage }),
        });

        setResult(res);
        setDeselectedIds(new Set());
        setSearchQuery("");

        if (res.uniquePages.length === 0) {
          addToast({
            type: "info",
            title: "No Unique Pages Found",
            description: "Every page in Set 1 matches Set 2.",
          });
        } else {
          setViewerBlob(res.blob);
          setViewerFileName(res.fileName);
          setViewerOpen(true);
          addToast({
            type: "success",
            title: "Comparison Complete",
            description: `Found ${res.uniquePages.length.toLocaleString()} unique pages (excluded ${res.excludedCount.toLocaleString()}).`,
          });
        }
      } catch (err) {
        addToast({
          type: "error",
          title: "Compare Failed",
          description:
            err instanceof Error ? err.message : "Failed to compare PDF sets.",
        });
      } finally {
        setProgress({ active: false, percent: 0, stage: "" });
      }
    },
    [addToast, deduplicateSet1, matchingMethod, sets],
  );

  const swapSets = useCallback(() => {
    const next = [
      { ...sets[1], label: "Set 1" },
      { ...sets[0], label: "Set 2" },
    ];
    setSets(next);
    setResult(null);
    setDeselectedIds(new Set());

    addToast({
      type: "info",
      title: "Switched Set 1 ⇄ Set 2",
      description: "Set 1 and Set 2 have been swapped.",
    });
  }, [addToast, sets]);

  const selectedUniquePages = useMemo(() => {
    const pages = result?.uniquePages || [];
    if (deselectedIds.size === 0) return pages;
    return pages.filter((p) => !deselectedIds.has(p.id));
  }, [result, deselectedIds]);

  const filteredUniquePages = useMemo(() => {
    const pages = result?.uniquePages || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        (p.orderId || "").toLowerCase().includes(q) ||
        p.trackingIds.some((t) => t.toLowerCase().includes(q)) ||
        p.fileName.toLowerCase().includes(q) ||
        p.snippet.toLowerCase().includes(q),
    );
  }, [result, searchQuery]);

  const togglePageSelection = useCallback((id: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllPages = useCallback(() => {
    setDeselectedIds(new Set());
  }, []);

  const clearAllPages = useCallback(() => {
    const allIds = (result?.uniquePages || []).map((p) => p.id);
    setDeselectedIds(new Set(allIds));
  }, [result]);

  const isPageSelected = useCallback(
    (page: ComparePageResult) => !deselectedIds.has(page.id),
    [deselectedIds],
  );

  const buildSelectedBlob = useCallback(async (): Promise<{
    blob: Blob;
    fileName: string;
    pageCount: number;
  } | null> => {
    const primarySet = sets[0];
    if (!primarySet || selectedUniquePages.length === 0) {
      addToast({
        type: "warning",
        title: "No Pages Selected",
        description: "Select at least one unique page first.",
      });
      return null;
    }

    if (
      result?.blob &&
      selectedUniquePages.length === result.uniquePages.length
    ) {
      return {
        blob: result.blob,
        fileName: result.fileName,
        pageCount: result.uniquePages.length,
      };
    }

    const rawBlob = await buildPdfFromSelectedPages(
      primarySet.files,
      selectedUniquePages,
      (percent, stage) => setProgress({ active: true, percent, stage }),
    );
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    return {
      blob: rawBlob,
      fileName: `unique_pdf_${selectedUniquePages.length}p_${timestamp}.pdf`,
      pageCount: selectedUniquePages.length,
    };
  }, [addToast, result, selectedUniquePages, sets]);

  const previewRawOutput = useCallback(async () => {
    setProgress({ active: true, percent: 15, stage: "Building output PDF..." });
    try {
      const built = await buildSelectedBlob();
      if (!built) return;
      setViewerBlob(built.blob);
      setViewerFileName(built.fileName);
      setViewerOpen(true);
    } catch (err) {
      addToast({
        type: "error",
        title: "Export Failed",
        description:
          err instanceof Error ? err.message : "Could not generate PDF.",
      });
    } finally {
      setProgress({ active: false, percent: 0, stage: "" });
    }
  }, [addToast, buildSelectedBlob]);

  const createCropperInputFile =
    useCallback(async (): Promise<UploadedPdfFile | null> => {
      setProgress({
        active: true,
        percent: 20,
        stage: "Preparing PDF for Cropper...",
      });
      try {
        const built = await buildSelectedBlob();
        if (!built) return null;

        const file = new File([built.blob], built.fileName, {
          type: "application/pdf",
        });
        const hash = await computeBytesHash(
          new Uint8Array(await built.blob.arrayBuffer()),
        );
        setViewerOpen(false);
        return {
          id: `compared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          name: built.fileName,
          size: file.size,
          pageCount: built.pageCount,
          hash,
        };
      } catch (err) {
        addToast({
          type: "error",
          title: "Prepare Failed",
          description:
            err instanceof Error
              ? err.message
              : "Could not prepare output PDF for cropping.",
        });
        return null;
      } finally {
        setProgress({ active: false, percent: 0, stage: "" });
      }
    }, [addToast, buildSelectedBlob]);

  return {
    sets,
    updateSetFiles,
    swapSets,
    matchingMethod,
    setMatchingMethod,
    deduplicateSet1,
    setDeduplicateSet1,
    progress,
    result,
    searchQuery,
    setSearchQuery,
    selectedUniquePages,
    filteredUniquePages,
    togglePageSelection,
    selectAllPages,
    clearAllPages,
    isPageSelected,
    runCompare,
    previewRawOutput,
    createCropperInputFile,
    viewerOpen,
    setViewerOpen,
    viewerBlob,
    viewerFileName,
  };
}
