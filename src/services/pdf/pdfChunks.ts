import { UI_YIELD_INTERVAL } from "@/constants/pdf";
import type { UploadedPdfFile } from "@/types";
import { yieldToMain } from "@/utils/format";
import { PDFDocument } from "pdf-lib";
import { filterUniqueOrderPages } from "./matching";
import { extractAllFingerprints } from "./textExtractor";

export interface PdfChunkRange {
  index: number;
  startPage: number;
  endPage: number;
  label: string;
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Merges uploaded PDFs sequentially while always skipping duplicate Order IDs
 * (both within each file and across files) so only unique-Order-ID pages are output.
 */
export async function mergeUploadedPdfs(files: UploadedPdfFile[]): Promise<{
  blob: Blob;
  pageCount: number;
  totalInputPages: number;
  skippedDuplicates: number;
  fileName: string;
}> {
  const totalInputPages = files.reduce((sum, f) => sum + f.pageCount, 0);
  const fps = await extractAllFingerprints(files);
  const fingerprintsByKey = new Map(fps.map((fp) => [fp.id, fp]));
  const { keptPagesByFile, keptTotal, duplicateDetails } = filterUniqueOrderPages(
    files,
    fingerprintsByKey,
  );
  fingerprintsByKey.clear();

  const outputDoc = await PDFDocument.create();
  let totalCopied = 0;

  for (const item of files) {
    const indices = keptPagesByFile.get(item.id);
    if (!indices?.length) continue;

    const buffer = await item.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(new Uint8Array(buffer), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const copied = await outputDoc.copyPages(srcDoc, indices);
    for (const page of copied) {
      outputDoc.addPage(page);
      totalCopied++;
      if (totalCopied % UI_YIELD_INTERVAL === 0) {
        await yieldToMain();
      }
    }
  }

  const outBytes = await outputDoc.save();
  const safeBuf = new ArrayBuffer(outBytes.byteLength);
  new Uint8Array(safeBuf).set(outBytes);

  return {
    blob: new Blob([safeBuf], { type: "application/pdf" }),
    pageCount: keptTotal,
    totalInputPages,
    skippedDuplicates: duplicateDetails.length,
    fileName: `merged_${files.length}_pdfs_${keptTotal}p.pdf`,
  };
}

export async function loadPdfDocumentFromBlob(blob: Blob): Promise<PDFDocument> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
}

export function buildPdfChunkRanges(
  totalPages: number,
  chunkSize: number,
): PdfChunkRange[] {
  if (totalPages <= 0 || chunkSize <= 0) return [];
  const ranges: PdfChunkRange[] = [];
  for (let start = 1, index = 0; start <= totalPages; start += chunkSize, index++) {
    const endPage = Math.min(totalPages, start + chunkSize - 1);
    ranges.push({
      index,
      startPage: start,
      endPage,
      label: `${start}–${endPage}`,
    });
  }
  return ranges;
}

export async function extractPdfChunkBlob(
  srcDoc: PDFDocument,
  startPage: number,
  endPage: number,
): Promise<Blob> {
  const total = srcDoc.getPageCount();
  const safeStart = Math.max(1, startPage);
  const safeEnd = Math.min(total, endPage);
  const indices: number[] = [];
  for (let i = safeStart - 1; i < safeEnd; i++) {
    indices.push(i);
  }

  const chunkDoc = await PDFDocument.create();
  const copied = await chunkDoc.copyPages(srcDoc, indices);
  for (const page of copied) {
    chunkDoc.addPage(page);
  }

  const outBytes = await chunkDoc.save();
  const safeBuf = new ArrayBuffer(outBytes.byteLength);
  new Uint8Array(safeBuf).set(outBytes);
  return new Blob([safeBuf], { type: "application/pdf" });
}

export function buildChunkFileName(
  baseFileName: string,
  startPage: number,
  endPage: number,
): string {
  const clean = baseFileName.replace(/\.pdf$/i, "");
  const stripped = clean.replace(/_\d+p$/, "");
  return `${stripped}_${startPage}-${endPage}.pdf`;
}
