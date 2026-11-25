import {
  buildPdfFromSelectedPages,
  comparePdfSets,
} from "@/services/pdf/compareEngine";
import { processUploadedPdfs } from "@/services/pdf/cropProcessor";
import type {
  ComparePageResult,
  CompareProcessResult,
  CompareSetBucket,
  CropConfiguration,
  MatchingMethod,
  ProcessingProgress,
  UploadedPdfFile,
} from "@/types";
import { useToast } from "@elsesourav/react-ui";
import { useCallback, useMemo, useState } from "react";

function createInitialSets(): CompareSetBucket[] {
  return [
    { id: "set-1", label: "Set 1", files: [] },
    { id: "set-2", label: "Set 2", files: [] },
  ];
}

function relabelSets(sets: CompareSetBucket[]): CompareSetBucket[] {
  return sets.map((s, index) => ({
    ...s,
    label: `Set ${index + 1}`,
  }));
}

export function useCompareWorkflow(config: CropConfiguration) {
  const { addToast } = useToast();

  const [sets, setSets] = useState<CompareSetBucket[]>(createInitialSets);
  const [matchingMethod, setMatchingMethod] = useState<MatchingMethod>("smart");
  const [deduplicateSet1, setDeduplicateSet1] = useState(true);
  const [applyCropOnCompare, setApplyCropOnCompare] = useState(false);

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
  const [viewerIsCropped, setViewerIsCropped] = useState(false);

  const updateSetFiles = useCallback((setId: string, files: UploadedPdfFile[]) => {
    setSets((prev) =>
      prev.map((s) => (s.id === setId ? { ...s, files } : s)),
    );
    setResult(null);
    setDeselectedIds(new Set());
  }, []);

  const addExcludeSet = useCallback(() => {
    setSets((prev) =>
      relabelSets([
        ...prev,
        {
          id: `set-${Date.now()}-${prev.length + 1}`,
          label: `Set ${prev.length + 1}`,
          files: [],
        },
      ]),
    );
    setResult(null);
  }, []);

  const removeExcludeSet = useCallback((setId: string) => {
    setSets((prev) => {
      if (prev.length <= 2) return prev;
      return relabelSets(prev.filter((s) => s.id !== setId));
    });
    setResult(null);
  }, []);

  const runCompare = useCallback(
    async (
      targetSets: CompareSetBucket[] = sets,
      shouldCropOutput = applyCropOnCompare,
    ) => {
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
          description: "Upload at least one PDF in Set 1 (Keep From).",
        });
        return;
      }

      if (excludeFilesCount === 0) {
        addToast({
          type: "warning",
          title: "Exclude Set is Empty",
          description: "Upload at least one PDF in Set 2 (or another subtract set).",
        });
        return;
      }

      setProgress({ active: true, percent: 2, stage: "Starting comparison..." });

      try {
        const res = await comparePdfSets({
          primarySet,
          excludeSets,
          matchingMethod,
          deduplicateSet1,
          onProgress: (percent, stage) =>
            setProgress({ active: true, percent, stage }),
        });

        let finalBlob = res.blob;
        let finalName = res.fileName;
        let isCropped = false;
        let serialStart: number | undefined;
        let serialEnd: number | undefined;

        if (shouldCropOutput && res.uniquePages.length > 0) {
          setProgress({
            active: true,
            percent: 88,
            stage: "Cropping & stamping serial numbers...",
          });
          const cropped = await processUploadedPdfs({
            files: primarySet.files,
            config,
            explicitPages: res.uniquePages.map((p) => ({
              fileId: p.fileId,
              pageIndex: p.pageIndex,
            })),
            onProgress: (percent, stage) =>
              setProgress({ active: true, percent, stage }),
          });
          finalBlob = cropped.blob;
          finalName = `unique_${cropped.fileName}`;
          isCropped = true;
          serialStart = cropped.serialStart;
          serialEnd = cropped.serialEnd;
        }

        const enriched: CompareProcessResult = {
          ...res,
          blob: finalBlob,
          fileName: finalName,
          isCropped,
          serialStart,
          serialEnd,
        };

        setResult(enriched);
        setDeselectedIds(new Set());
        setSearchQuery("");

        if (res.uniquePages.length === 0) {
          addToast({
            type: "info",
            title: "No Unique Pages Found",
            description:
              "Every page in Set 1 matches the exclude sets. Click Switch to test the reverse direction!",
          });
        } else {
          setViewerBlob(finalBlob);
          setViewerFileName(finalName);
          setViewerIsCropped(isCropped);
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
    [addToast, applyCropOnCompare, config, deduplicateSet1, matchingMethod, sets],
  );

  const swapWithPrimary = useCallback(
    (targetIndex = 1, recompareImmediately = false) => {
      if (targetIndex < 1 || targetIndex >= sets.length) return;
      const next = [...sets];
      const temp = next[0];
      next[0] = next[targetIndex];
      next[targetIndex] = temp;
      const relabeled = relabelSets(next);
      setSets(relabeled);
      setResult(null);
      setDeselectedIds(new Set());

      addToast({
        type: "info",
        title: `Swapped Set 1 ⇄ Set ${targetIndex + 1}`,
        description: "Primary and subtract sets switched.",
      });

      if (recompareImmediately) {
        void runCompare(relabeled);
      }
    },
    [addToast, runCompare, sets],
  );

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

  const exportSelectedPages = useCallback(
    async (cropOutput: boolean) => {
      const primarySet = sets[0];
      if (!primarySet || selectedUniquePages.length === 0) {
        addToast({
          type: "warning",
          title: "No Pages Selected",
          description: "Select at least one unique page to generate the PDF.",
        });
        return;
      }

      setProgress({
        active: true,
        percent: 15,
        stage: cropOutput
          ? "Cropping & numbering selected pages..."
          : "Building unique PDF...",
      });

      try {
        if (cropOutput) {
          const cropped = await processUploadedPdfs({
            files: primarySet.files,
            config,
            explicitPages: selectedUniquePages.map((p) => ({
              fileId: p.fileId,
              pageIndex: p.pageIndex,
            })),
            onProgress: (percent, stage) =>
              setProgress({ active: true, percent, stage }),
          });
          setViewerBlob(cropped.blob);
          setViewerFileName(`unique_${cropped.fileName}`);
          setViewerIsCropped(true);
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  serialStart: cropped.serialStart,
                  serialEnd: cropped.serialEnd,
                }
              : prev,
          );
        } else {
          const rawBlob = await buildPdfFromSelectedPages(
            primarySet.files,
            selectedUniquePages,
            (percent, stage) =>
              setProgress({ active: true, percent, stage }),
          );
          const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, "-");
          setViewerBlob(rawBlob);
          setViewerFileName(
            `unique_pdf_${selectedUniquePages.length}p_${timestamp}.pdf`,
          );
          setViewerIsCropped(false);
        }
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
    },
    [addToast, config, selectedUniquePages, sets],
  );

  return {
    sets,
    updateSetFiles,
    addExcludeSet,
    removeExcludeSet,
    swapWithPrimary,
    matchingMethod,
    setMatchingMethod,
    deduplicateSet1,
    setDeduplicateSet1,
    applyCropOnCompare,
    setApplyCropOnCompare,
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
    exportSelectedPages,
    viewerOpen,
    setViewerOpen,
    viewerBlob,
    viewerFileName,
    viewerIsCropped,
  };
}
