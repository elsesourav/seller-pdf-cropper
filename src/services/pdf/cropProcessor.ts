import {
  DEFAULT_MARGINS,
  STANDARD_A4_WIDTH,
  UI_YIELD_INTERVAL,
} from "@/constants/pdf";
import type {
  CropBoxMargins,
  CropConfiguration,
  CropProcessResult,
  DocumentType,
  DuplicatePageInfo,
  PageFingerprint,
  UploadedPdfFile,
} from "@/types";
import { yieldToMain } from "@/utils/format";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { PageFingerprintMatcher } from "./matching";
import { extractAllFingerprints } from "./textExtractor";

const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

const measureCanvas =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
const measureCtx = measureCanvas?.getContext("2d") || null;

function measureTextWidth(text: string, fontSize: number): number {
  if (!measureCtx) {
    return Math.ceil(text.length * fontSize * 0.58);
  }
  measureCtx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  return Math.ceil(measureCtx.measureText(text).width);
}

function clampCropBox(
  box: CropBoxMargins,
  pageWidth: number,
  pageHeight: number,
): CropBoxMargins {
  const left = Math.max(0, Math.min(box.left, Math.max(0, pageWidth - 10)));
  const bottom = Math.max(0, Math.min(box.bottom, Math.max(0, pageHeight - 10)));
  const width = Math.max(10, Math.min(box.width, pageWidth - left));
  const height = Math.max(10, Math.min(box.height, pageHeight - bottom));
  return { left, bottom, width, height };
}

export function getEffectiveCropBox(
  pageWidth: number,
  pageHeight: number,
  documentType: DocumentType,
  margins: CropConfiguration["margins"],
): CropBoxMargins {
  if (documentType === "bill") {
    const custom = margins.bill;
    const isDefaultBill =
      custom.left === DEFAULT_MARGINS.bill.left &&
      custom.width === DEFAULT_MARGINS.bill.width &&
      custom.bottom === DEFAULT_MARGINS.bill.bottom &&
      custom.height === DEFAULT_MARGINS.bill.height;

    if (isDefaultBill && Math.abs(pageWidth - STANDARD_A4_WIDTH) > 2) {
      const sideMargin = Math.min(30, Math.floor(pageWidth * 0.06));
      return {
        left: sideMargin,
        bottom: Math.min(70, Math.max(0, pageHeight - 10)),
        width: Math.max(20, pageWidth - sideMargin * 2),
        height: Math.min(390, pageHeight),
      };
    }

    return clampCropBox(custom, pageWidth, pageHeight);
  }

  return clampCropBox(margins.label, pageWidth, pageHeight);
}

function drawSerialNumberOnPage(params: {
  page: PDFPage;
  font: PDFFont;
  serialText: string;
  cropBox: CropBoxMargins;
  isBill: boolean;
  serialFontSize: number;
  clearBottomLine: boolean;
}): void {
  const {
    page,
    font,
    serialText,
    cropBox,
    isBill,
    serialFontSize,
    clearBottomLine,
  } = params;

  const bandHeight = isBill
    ? Math.max(12, serialFontSize + 4)
    : Math.max(11, serialFontSize + 3);
  const bandY = cropBox.bottom + 2;

  if (!isBill && clearBottomLine) {
    const clearHeight =
      cropBox.bottom < 458
        ? Math.min(25, Math.max(bandHeight + 6, 458 - cropBox.bottom))
        : Math.max(bandHeight + 3, 12);
    page.drawRectangle({
      x: cropBox.left,
      y: Math.max(0, cropBox.bottom - 1),
      width: cropBox.width,
      height: clearHeight,
      color: WHITE,
    });
  }

  // Generous region width supports 5-6 digit serial numbers (e.g. 10000+) cleanly
  const regionWidth = isBill ? 110 : 88;
  const regionX = isBill
    ? cropBox.left + 8
    : cropBox.left + cropBox.width - regionWidth - 8;

  let finalSize = Math.max(5, Math.min(24, serialFontSize));
  const minFont = Math.max(5, Math.floor(finalSize * 0.7));
  while (
    finalSize > minFont &&
    measureTextWidth(serialText, finalSize) > regionWidth - 2
  ) {
    finalSize -= 1;
  }

  const textWidth = measureTextWidth(serialText, finalSize);
  const textX = isBill
    ? regionX
    : Math.max(regionX, regionX + regionWidth - textWidth);
  const textY = bandY + (bandHeight - finalSize) / 2 + (isBill ? 0.5 : 0.2);

  if (isBill || !clearBottomLine) {
    const padX = 2.5;
    const padY = 1.5;
    page.drawRectangle({
      x: textX - padX,
      y: textY - padY,
      width: textWidth + padX * 2,
      height: finalSize + padY * 2,
      color: WHITE,
    });
  }

  page.drawText(serialText, {
    x: textX,
    y: textY,
    size: finalSize,
    font,
    color: BLACK,
  });
}

/**
 * Streams file-by-file cropping and sequential serial numbering so 5,000–10,000
 * PDFs process cleanly with O(1) source file buffers in memory.
 */
export async function processUploadedPdfs(params: {
  files: UploadedPdfFile[];
  config: CropConfiguration;
  explicitPages?: Array<{ fileId: string; pageIndex: number }>;
  onProgress?: (percent: number, stage: string) => void;
}): Promise<CropProcessResult> {
  const { files, config, explicitPages, onProgress } = params;

  if (!files.length) {
    throw new Error("Please upload at least one PDF file.");
  }

  const totalInputPages = explicitPages
    ? explicitPages.length
    : files.reduce((sum, f) => sum + f.pageCount, 0);

  let fingerprintsByKey = new Map<string, PageFingerprint>();

  if (!explicitPages && config.skipDuplicatePages) {
    onProgress?.(4, "Scanning PDF pages for duplicates...");
    const fps = await extractAllFingerprints(
      files,
      config.duplicateMatchMethod,
      (done, total, label) => {
        const pct = total > 0 ? 4 + Math.round((done / total) * 40) : 44;
        onProgress?.(pct, label);
      },
    );
    fingerprintsByKey = new Map(fps.map((fp) => [fp.id, fp]));
  }

  const fileOrder = new Map(files.map((f, idx) => [f.id, { file: f, order: idx }]));
  const duplicateMatcher = new PageFingerprintMatcher(config.duplicateMatchMethod);
  const duplicateDetails: DuplicatePageInfo[] = [];
  const keptPagesByFile = new Map<string, number[]>();
  let keptTotal = 0;

  if (explicitPages) {
    for (const item of explicitPages) {
      if (!fileOrder.has(item.fileId)) continue;
      let list = keptPagesByFile.get(item.fileId);
      if (!list) {
        list = [];
        keptPagesByFile.set(item.fileId, list);
      }
      list.push(item.pageIndex);
      keptTotal++;
    }
  } else {
    for (const file of files) {
      for (let idx = 0; idx < file.pageCount; idx++) {
        if (config.skipDuplicatePages) {
          const fp = fingerprintsByKey.get(`${file.id}:${idx}`);
          if (fp) {
            const matchedKey = duplicateMatcher.hasMatch(fp);
            if (matchedKey) {
              duplicateDetails.push({
                fileName: file.name,
                pageNumber: idx + 1,
                matchedKey,
              });
              continue;
            }
            duplicateMatcher.add(fp);
          }
        }

        let list = keptPagesByFile.get(file.id);
        if (!list) {
          list = [];
          keptPagesByFile.set(file.id, list);
        }
        list.push(idx);
        keptTotal++;
      }
    }
  }

  fingerprintsByKey.clear();

  if (keptTotal === 0) {
    throw new Error("No pages remained after duplicate filtering.");
  }

  const orderedFileIds = Array.from(keptPagesByFile.keys()).sort(
    (a, b) => (fileOrder.get(a)?.order ?? 0) - (fileOrder.get(b)?.order ?? 0),
  );

  const outputDoc = await PDFDocument.create();
  const helveticaBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);
  const isBill = config.documentType === "bill";
  const startSerial = Math.max(1, Math.round(config.startingSerial || 1));

  let serialOffset = 0;

  for (const fileId of orderedFileIds) {
    const entry = fileOrder.get(fileId);
    const pageIndices = keptPagesByFile.get(fileId);
    if (!entry || !pageIndices?.length) continue;

    const buffer = await entry.file.file.arrayBuffer();
    const srcDoc = await PDFDocument.load(new Uint8Array(buffer), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    const copiedPages = await outputDoc.copyPages(srcDoc, pageIndices);

    for (const copiedPage of copiedPages) {
      outputDoc.addPage(copiedPage);

      const { width, height } = copiedPage.getSize();
      const cropBox = getEffectiveCropBox(
        width,
        height,
        config.documentType,
        config.margins,
      );

      copiedPage.setCropBox(cropBox.left, cropBox.bottom, cropBox.width, cropBox.height);
      copiedPage.setMediaBox(cropBox.left, cropBox.bottom, cropBox.width, cropBox.height);
      copiedPage.setBleedBox(cropBox.left, cropBox.bottom, cropBox.width, cropBox.height);
      copiedPage.setTrimBox(cropBox.left, cropBox.bottom, cropBox.width, cropBox.height);
      copiedPage.setArtBox(cropBox.left, cropBox.bottom, cropBox.width, cropBox.height);

      if (config.includeSerial) {
        drawSerialNumberOnPage({
          page: copiedPage,
          font: helveticaBold,
          serialText: String(startSerial + serialOffset),
          cropBox,
          isBill,
          serialFontSize: config.serialFontSize,
          clearBottomLine: config.clearBottomLine,
        });
      }

      serialOffset++;
      if (serialOffset % UI_YIELD_INTERVAL === 0) {
        const pct = 46 + Math.round((serialOffset / keptTotal) * 48);
        onProgress?.(
          pct,
          `Cropping page ${serialOffset.toLocaleString()} of ${keptTotal.toLocaleString()}...`,
        );
        await yieldToMain();
      }
    }
  }

  onProgress?.(97, "Saving cropped PDF...");
  const savedBytes = await outputDoc.save();
  const outBuffer = new ArrayBuffer(savedBytes.byteLength);
  new Uint8Array(outBuffer).set(savedBytes);
  const blob = new Blob([outBuffer], { type: "application/pdf" });

  onProgress?.(100, "Done!");

  const baseName =
    files.length === 1
      ? files[0].name.replace(/\.pdf$/i, "")
      : `${files.length}_pdfs_merged`;
  const suffix = isBill ? "invoices" : "labels";

  return {
    blob,
    fileName: `${baseName}_${suffix}_${keptTotal}p.pdf`,
    inputFileCount: files.length,
    totalInputPages,
    duplicatePagesSkipped: duplicateDetails.length,
    duplicateDetails,
    outputPages: keptTotal,
    serialStart: config.includeSerial ? startSerial : undefined,
    serialEnd: config.includeSerial ? startSerial + keptTotal - 1 : undefined,
  };
}
