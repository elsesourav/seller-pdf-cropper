import { UI_YIELD_INTERVAL } from "@/constants/pdf";
import type {
  ComparePageResult,
  CompareProcessResult,
  CompareSetBucket,
  CompareSetSummary,
  MatchingMethod,
  UploadedPdfFile,
} from "@/types";
import { yieldToMain } from "@/utils/format";
import { PDFDocument } from "pdf-lib";
import { PageFingerprintMatcher } from "./matching";
import {
  extractAllFingerprints,
  streamExtractFingerprints,
} from "./textExtractor";

/**
 * Streams selected pages into a new PDF one source file at a time so copying
 * 5,000–10,000 pages never holds more than one source PDFDocument in RAM.
 */
export async function buildPdfFromSelectedPages(
  sourceFiles: UploadedPdfFile[],
  pages: Array<{ fileId: string; pageIndex: number }>,
  onProgress?: (percent: number, stage: string) => void,
): Promise<Blob> {
  const fileOrder = new Map(sourceFiles.map((f, idx) => [f.id, { file: f, order: idx }]));
  const pagesByFile = new Map<string, number[]>();

  for (const p of pages) {
    let list = pagesByFile.get(p.fileId);
    if (!list) {
      list = [];
      pagesByFile.set(p.fileId, list);
    }
    list.push(p.pageIndex);
  }

  const orderedFileIds = Array.from(pagesByFile.keys()).sort(
    (a, b) => (fileOrder.get(a)?.order ?? 0) - (fileOrder.get(b)?.order ?? 0),
  );

  const outputDoc = await PDFDocument.create();
  let copiedCount = 0;
  const totalPages = pages.length;

  for (const fileId of orderedFileIds) {
    const entry = fileOrder.get(fileId);
    const indices = pagesByFile.get(fileId);
    if (!entry || !indices?.length) continue;

    const buffer = await entry.file.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(new Uint8Array(buffer), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const copiedPages = await outputDoc.copyPages(srcDoc, indices);
    for (const cp of copiedPages) {
      outputDoc.addPage(cp);
      copiedCount++;
      if (copiedCount % UI_YIELD_INTERVAL === 0) {
        const pct = totalPages > 0 ? Math.round((copiedCount / totalPages) * 90) : 90;
        onProgress?.(pct, `Assembling page ${copiedCount.toLocaleString()} of ${totalPages.toLocaleString()}...`);
        await yieldToMain();
      }
    }
  }

  onProgress?.(96, "Finalizing unique PDF...");
  const outBytes = await outputDoc.save();
  const outBuffer = new ArrayBuffer(outBytes.byteLength);
  new Uint8Array(outBuffer).set(outBytes);
  return new Blob([outBuffer], { type: "application/pdf" });
}

export async function comparePdfSets(params: {
  primarySet: CompareSetBucket;
  excludeSets: CompareSetBucket[];
  matchingMethod: MatchingMethod;
  deduplicateSet1: boolean;
  onProgress?: (percent: number, stage: string) => void;
}): Promise<CompareProcessResult> {
  const {
    primarySet,
    excludeSets,
    matchingMethod,
    deduplicateSet1,
    onProgress,
  } = params;

  const set1TotalPages = primarySet.files.reduce((s, f) => s + f.pageCount, 0);
  const excludeFiles = excludeSets.flatMap((s) => s.files);
  const excludeTotalPages = excludeFiles.reduce((s, f) => s + f.pageCount, 0);

  const setSummaries: CompareSetSummary[] = [
    {
      id: primarySet.id,
      label: primarySet.label,
      fileCount: primarySet.files.length,
      pageCount: set1TotalPages,
    },
    ...excludeSets.map((s) => ({
      id: s.id,
      label: s.label,
      fileCount: s.files.length,
      pageCount: s.files.reduce((sum, f) => sum + f.pageCount, 0),
    })),
  ];

  // Stream all exclude sets (Set 2..Set N) directly into matcher without retaining raw page lists
  const excludeMatcher = new PageFingerprintMatcher(matchingMethod);
  if (excludeFiles.length > 0) {
    onProgress?.(4, `Indexing ${excludeSets.length} exclude set${excludeSets.length > 1 ? "s" : ""}...`);
    await streamExtractFingerprints({
      files: excludeFiles,
      method: matchingMethod,
      onFileFingerprints: (fps) => {
        for (const fp of fps) excludeMatcher.add(fp);
      },
      onProgress: (done, total, label) => {
        const pct = total > 0 ? 4 + Math.round((done / total) * 40) : 44;
        onProgress?.(pct, `Exclude sets: ${label}`);
      },
    });
  }

  onProgress?.(46, `Scanning ${primarySet.label}...`);
  const set1Pages = await extractAllFingerprints(
    primarySet.files,
    matchingMethod,
    (done, total, label) => {
      const pct = total > 0 ? 46 + Math.round((done / total) * 34) : 80;
      onProgress?.(pct, `${primarySet.label}: ${label}`);
    },
  );

  onProgress?.(82, "Computing unique pages...");
  const set1SeenMatcher = new PageFingerprintMatcher(matchingMethod);
  const uniquePages: ComparePageResult[] = [];
  let excludedCount = 0;
  let internalDuplicatesRemoved = 0;

  for (let i = 0; i < set1Pages.length; i++) {
    const fp = set1Pages[i];
    if (excludeMatcher.hasMatch(fp)) {
      excludedCount++;
      continue;
    }

    if (deduplicateSet1) {
      if (set1SeenMatcher.hasMatch(fp)) {
        internalDuplicatesRemoved++;
        continue;
      }
      set1SeenMatcher.add(fp);
    }

    uniquePages.push({ ...fp, selected: true });
    if ((i + 1) % 500 === 0) {
      await yieldToMain();
    }
  }

  let blob: Blob | null = null;
  if (uniquePages.length > 0) {
    blob = await buildPdfFromSelectedPages(
      primarySet.files,
      uniquePages,
      (pct, stage) => {
        onProgress?.(85 + Math.round(pct * 0.14), stage);
      },
    );
  }

  onProgress?.(100, "Comparison complete!");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

  return {
    set1TotalPages,
    excludeTotalPages,
    setSummaries,
    excludedCount,
    internalDuplicatesRemoved,
    uniquePages,
    blob,
    fileName: `unique_pdf_${uniquePages.length}p_${timestamp}.pdf`,
    isCropped: false,
  };
}
