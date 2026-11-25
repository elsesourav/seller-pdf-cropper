import { STANDARD_A4_HEIGHT, STANDARD_A4_WIDTH } from "@/constants/pdf";
import type {
  DocumentType,
  PdfPreviewData,
  RenderedPageThumbnail,
} from "@/types";
import { ensurePdfWorker, pdfjsLib } from "./worker";

export async function renderPdfPagePreview(
  file: File,
  pageNumber = 1,
  renderScale = 2,
): Promise<PdfPreviewData> {
  ensurePdfWorker();

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  try {
    const safePageNum = Math.max(1, Math.min(pageNumber, pdfDoc.numPages));
    const page = await pdfDoc.getPage(safePageNum);

    const ptViewport = page.getViewport({ scale: 1.0 });
    const renderViewport = page.getViewport({ scale: renderScale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to initialize 2D canvas context");
    }

    canvas.width = Math.round(renderViewport.width);
    canvas.height = Math.round(renderViewport.height);

    await page.render({
      canvasContext: context,
      viewport: renderViewport,
      canvas,
    }).promise;

    return {
      dataUrl: canvas.toDataURL("image/png"),
      pageWidthPt: Math.round(ptViewport.width),
      pageHeightPt: Math.round(ptViewport.height),
      isFallback: false,
    };
  } finally {
    await pdfDoc.destroy();
  }
}

export async function renderPdfPagesToImages(
  blob: Blob,
  startPage = 1,
  count = 10,
  scale = 1.5,
): Promise<{ totalPages: number; pages: RenderedPageThumbnail[] }> {
  ensurePdfWorker();
  const buffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  try {
    const totalPages = pdfDoc.numPages;
    const safeStart = Math.max(1, Math.min(startPage, totalPages));
    const safeEnd = Math.min(totalPages, safeStart + count - 1);
    const pages: RenderedPageThumbnail[] = [];

    for (let p = safeStart; p <= safeEnd; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      pages.push({
        pageNumber: p,
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
      });
    }

    return { totalPages, pages };
  } finally {
    await pdfDoc.destroy();
  }
}

export function generateFallbackLabelPreviewData(
  documentType: DocumentType = "label",
): PdfPreviewData {
  if (typeof document === "undefined") {
    return {
      dataUrl: "",
      pageWidthPt: STANDARD_A4_WIDTH,
      pageHeightPt: STANDARD_A4_HEIGHT,
      isFallback: true,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = STANDARD_A4_WIDTH;
  canvas.height = STANDARD_A4_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      dataUrl: "",
      pageWidthPt: STANDARD_A4_WIDTH,
      pageHeightPt: STANDARD_A4_HEIGHT,
      isFallback: true,
    };
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, STANDARD_A4_WIDTH, STANDARD_A4_HEIGHT);

  const lLeft = 188;
  const lTop = 27;
  const lWidth = 219;
  const lHeight = 380;

  ctx.strokeStyle = documentType === "label" ? "#111827" : "#64748b";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(lLeft, lTop, lWidth, lHeight);

  ctx.fillStyle = "#111827";
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("STD", lLeft + 6, lTop + 14);
  ctx.font = "bold 8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("E-Kart Logistics", lLeft + 38, lTop + 11);
  ctx.font = "bold 7px monospace";
  ctx.fillText("OD338996929546484100", lLeft + 38, lTop + 21);

  ctx.beginPath();
  ctx.moveTo(lLeft, lTop + 24);
  ctx.lineTo(lLeft + lWidth, lTop + 24);
  ctx.stroke();

  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Ordered through", lLeft + 6, lTop + 36);
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Flipkart", lLeft + 18, lTop + 48);

  for (let by = lTop + 58; by < lTop + 158; by += 3) {
    ctx.fillRect(lLeft + 24, by, 34, by % 2 === 0 ? 1.8 : 0.9);
  }
  const qrX = lLeft + 84;
  const qrY = lTop + 34;
  for (let gx = 0; gx < 12; gx++) {
    for (let gy = 0; gy < 12; gy++) {
      if ((gx * 7 + gy * 13 + gx * gy) % 3 === 0) {
        ctx.fillRect(qrX + gx * 8, qrY + gy * 8, 5, 5);
      }
    }
  }

  ctx.beginPath();
  ctx.moveTo(lLeft, lTop + 172);
  ctx.lineTo(lLeft + lWidth, lTop + 172);
  ctx.stroke();

  ctx.font = "bold 7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Shipping/Customer Address:", lLeft + 6, lTop + 184);
  ctx.font = "7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sample Customer Name", lLeft + 6, lTop + 196);
  ctx.fillText("Sample Street, Sector 4", lLeft + 6, lTop + 206);
  ctx.font = "bold 7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("City - 700001, IN-WB", lLeft + 6, lTop + 218);

  ctx.strokeRect(lLeft, lTop + 248, lWidth, 46);
  ctx.font = "bold 6.5px monospace";
  ctx.fillText("SKU ID | QTY: 1", lLeft + 6, lTop + 262);
  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sample Shipping Item Description", lLeft + 6, lTop + 276);

  ctx.font = "bold 7px monospace";
  ctx.fillText("FMPP4419698894", lLeft + 6, lTop + 310);
  for (let bx = lLeft + 6; bx < lLeft + lWidth - 46; bx += 3) {
    ctx.fillRect(bx, lTop + 314, bx % 2 === 0 ? 1.8 : 0.9, 26);
  }
  ctx.strokeRect(lLeft + lWidth - 40, lTop + 312, 34, 26);
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("B10", lLeft + lWidth - 32, lTop + 329);

  ctx.beginPath();
  ctx.moveTo(lLeft, lTop + 348);
  ctx.lineTo(lLeft + lWidth, lTop + 348);
  ctx.stroke();
  ctx.font = "6px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Not for resale.", lLeft + 6, lTop + 358);
  ctx.font = "bold 7px monospace";
  ctx.fillText("#1", lLeft + lWidth - 20, lTop + 368);

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(30, 420);
  ctx.lineTo(565, 420);
  ctx.stroke();
  ctx.restore();

  const bLeft = 30;
  const bTop = 442;
  const bWidth = 535;
  const bHeight = 340;
  ctx.strokeStyle = documentType === "bill" ? "#111827" : "#64748b";
  ctx.strokeRect(bLeft, bTop, bWidth, bHeight);

  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Tax Invoice", bLeft + 12, bTop + 22);
  ctx.font = "8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sold By: Sample Seller Store", bLeft + 12, bTop + 40);
  ctx.fillText("Order ID: OD338996929546484100", bLeft + 12, bTop + 54);
  ctx.fillText("Invoice No: INV-2026-484100", bLeft + 12, bTop + 68);
  ctx.strokeRect(bLeft + 8, bTop + 94, bWidth - 16, 48);
  ctx.fillText("Item Description", bLeft + 16, bTop + 110);
  ctx.fillText("Qty", bLeft + 320, bTop + 110);
  ctx.fillText("Total (INR)", bLeft + 455, bTop + 110);
  ctx.font = "bold 8.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Grand Total: Rs. 249.00", bLeft + 380, bTop + 175);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    pageWidthPt: STANDARD_A4_WIDTH,
    pageHeightPt: STANDARD_A4_HEIGHT,
    isFallback: true,
  };
}
