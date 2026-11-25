import { PDF_TEXT_CONCURRENCY } from "@/constants/pdf";
import type {
  ExtractionProgressCallback,
  PageFingerprint,
  UploadedPdfFile,
} from "@/types";
import { yieldToMain } from "@/utils/format";
import { extractOrderId } from "./matching";
import { ensurePdfWorker, pdfjsLib } from "./worker";

async function extractSingleFileFingerprints(
  item: UploadedPdfFile,
): Promise<PageFingerprint[]> {
  const buffer = await item.file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const pageResults: PageFingerprint[] = [];

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

      const orderId = rawText ? extractOrderId(rawText) : null;

      pageResults.push({
        id: `${item.id}:${p - 1}`,
        fileId: item.id,
        fileName: item.name,
        pageIndex: p - 1,
        displayPageNumber: p,
        orderId,
      });
    }
  } finally {
    await pdfDoc.destroy();
  }

  return pageResults;
}

/**
 * Streams Order-ID extraction across thousands of files in bounded batches
 * while immediately releasing PDF.js documents and ArrayBuffers.
 */
export async function streamExtractFingerprints(params: {
  files: UploadedPdfFile[];
  onFileFingerprints: (fps: PageFingerprint[]) => void;
  onProgress?: ExtractionProgressCallback;
}): Promise<void> {
  const { files, onFileFingerprints, onProgress } = params;
  ensurePdfWorker();

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  let processedPages = 0;

  for (let start = 0; start < files.length; start += PDF_TEXT_CONCURRENCY) {
    const batch = files.slice(start, start + PDF_TEXT_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((item) => extractSingleFileFingerprints(item)),
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
      `${processedPages.toLocaleString()} / ${totalPages.toLocaleString()} (${lastFile?.name || ""})`,
    );

    await yieldToMain();
  }
}

export async function extractAllFingerprints(
  files: UploadedPdfFile[],
  onProgress?: ExtractionProgressCallback,
): Promise<PageFingerprint[]> {
  const collected: PageFingerprint[] = [];
  await streamExtractFingerprints({
    files,
    onFileFingerprints: (fps) => {
      for (const fp of fps) collected.push(fp);
    },
    onProgress,
  });
  return collected;
}
