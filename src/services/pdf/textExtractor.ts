import { PDF_TEXT_CONCURRENCY } from "@/constants/pdf";
import type {
  ExtractionProgressCallback,
  MatchingMethod,
  PageFingerprint,
  UploadedPdfFile,
} from "@/types";
import { yieldToMain } from "@/utils/format";
import { hashNormalizedText } from "@/utils/hash";
import {
  extractOrderId,
  extractTrackingIds,
  tokenizeWords,
} from "./matching";
import { ensurePdfWorker, pdfjsLib } from "./worker";

async function extractSingleFileFingerprints(
  item: UploadedPdfFile,
  method: MatchingMethod,
): Promise<PageFingerprint[]> {
  const buffer = await item.file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const pageResults: PageFingerprint[] = [];
  const alwaysKeepWords = method === "fuzzy";

  try {
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const textContent = await page.getTextContent();
      const rawText = (
        Array.isArray(textContent?.items) ? textContent.items : []
      )
        .map((entry: unknown) =>
          String((entry as { str?: unknown })?.str || ""),
        )
        .join(" ");

      const normalized = rawText.trim().toLowerCase().replace(/\s+/g, " ");
      const hasText = normalized.length > 0;
      const orderId = hasText ? extractOrderId(rawText) : null;
      const trackingIds = hasText ? extractTrackingIds(rawText) : [];
      const textHash = hasText ? hashNormalizedText(normalized) : "";

      const needsWords =
        hasText &&
        (alwaysKeepWords ||
          (!orderId &&
            (method !== "smart" || trackingIds.length === 0)));

      const words = needsWords ? tokenizeWords(normalized) : null;
      const snippet = hasText
        ? rawText.trim().replace(/\s+/g, " ").slice(0, 96)
        : "(Scanned image / no text layer)";

      pageResults.push({
        id: `${item.id}:${p - 1}`,
        fileId: item.id,
        fileName: item.name,
        pageIndex: p - 1,
        displayPageNumber: p,
        orderId,
        trackingIds,
        textHash,
        hasText,
        words,
        snippet,
      });
    }
  } finally {
    await pdfDoc.destroy();
  }

  return pageResults;
}

/**
 * Streams fingerprint extraction across thousands of files in bounded concurrent
 * batches, invoking onFileExtracted in deterministic upload order and immediately
 * freeing PDF.js workers & file ArrayBuffers.
 */
export async function streamExtractFingerprints(params: {
  files: UploadedPdfFile[];
  method: MatchingMethod;
  onFileFingerprints: (fps: PageFingerprint[]) => void;
  onProgress?: ExtractionProgressCallback;
}): Promise<void> {
  const { files, method, onFileFingerprints, onProgress } = params;
  ensurePdfWorker();

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  let processedPages = 0;

  for (let start = 0; start < files.length; start += PDF_TEXT_CONCURRENCY) {
    const batch = files.slice(start, start + PDF_TEXT_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((item) => extractSingleFileFingerprints(item, method)),
    );

    for (let i = 0; i < batchResults.length; i++) {
      const fps = batchResults[i];
      onFileFingerprints(fps);
      processedPages += fps.length;
    }

    const lastFile = batch[batch.length - 1];
    onProgress?.(
      processedPages,
      totalPages,
      `Scanned ${processedPages.toLocaleString()} / ${totalPages.toLocaleString()} pages (${lastFile?.name || ""})`,
    );

    await yieldToMain();
  }
}

export async function extractAllFingerprints(
  files: UploadedPdfFile[],
  method: MatchingMethod,
  onProgress?: ExtractionProgressCallback,
): Promise<PageFingerprint[]> {
  const collected: PageFingerprint[] = [];
  await streamExtractFingerprints({
    files,
    method,
    onFileFingerprints: (fps) => {
      for (const fp of fps) collected.push(fp);
    },
    onProgress,
  });
  return collected;
}
