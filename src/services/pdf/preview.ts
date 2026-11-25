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

  const lLeft = 190.5;
  const lTop = 28.5;
  const lWidth = 213.8;
  const lHeight = 352.5;
  const labelStroke = documentType === "label" ? "#111827" : "#475569";

  ctx.strokeStyle = labelStroke;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(lLeft, lTop, lWidth, lHeight);

  // Header row (STD | E-Kart Logistics / OD... | E)
  ctx.beginPath();
  ctx.moveTo(lLeft + 21, lTop);
  ctx.lineTo(lLeft + 21, lTop + 26);
  ctx.moveTo(lLeft + lWidth - 17, lTop);
  ctx.lineTo(lLeft + lWidth - 17, lTop + 26);
  ctx.moveTo(lLeft + 21, lTop + 13);
  ctx.lineTo(lLeft + lWidth - 17, lTop + 13);
  ctx.moveTo(lLeft + 114, lTop);
  ctx.lineTo(lLeft + 114, lTop + 26);
  ctx.moveTo(lLeft, lTop + 26);
  ctx.lineTo(lLeft + lWidth, lTop + 26);
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("STD", lLeft + 2.5, lTop + 15);
  ctx.fillText("E", lLeft + lWidth - 12, lTop + 15);
  ctx.font = "7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("E-Kart Logistics", lLeft + 24, lTop + 11);
  ctx.font = "7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("OD439237687938616100", lLeft + 24, lTop + 22.5);
  ctx.font = "bold 8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("COD", lLeft + 117, lTop + 22.5);

  // Vertical split below header -> left Flipkart+AWB column, right QR + Customer Address
  const splitX = lLeft + 68;
  ctx.beginPath();
  ctx.moveTo(splitX, lTop + 26);
  ctx.lineTo(splitX, lTop + 212);
  ctx.moveTo(splitX, lTop + 144);
  ctx.lineTo(lLeft + lWidth, lTop + 144);
  ctx.moveTo(lLeft, lTop + 212);
  ctx.lineTo(lLeft + lWidth, lTop + 212);
  ctx.stroke();

  ctx.font = "7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Ordered through", lLeft + 4, lTop + 36);
  ctx.font = "italic bold 8.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Flipkart", lLeft + 21, lTop + 53);
  ctx.fillRect(lLeft + 54, lTop + 43, 10, 11);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("f", lLeft + 57, lTop + 52);
  ctx.fillStyle = "#111827";

  for (let by = lTop + 60; by < lTop + 174; by += 2.6) {
    ctx.fillRect(lLeft + 23, by, 18, (Math.round(by * 3) % 2) === 0 ? 1.5 : 0.8);
  }
  ctx.save();
  ctx.translate(lLeft + 56, lTop + 64);
  ctx.rotate(Math.PI / 2);
  ctx.font = "bold 6.5px monospace";
  ctx.fillText("AWB No. FMPC6793824320", 0, 0);
  ctx.restore();

  ctx.font = "7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("HBD: 25 - 11", lLeft + 4, lTop + 195);
  ctx.fillText("CPD: 01 - 12", lLeft + 4, lTop + 206);

  // Top-right QR block
  const qrX = splitX + 18;
  const qrY = lTop + 37;
  const cell = 4.6;
  for (let gx = 0; gx < 21; gx++) {
    for (let gy = 0; gy < 21; gy++) {
      const inFinder =
        (gx < 6 && gy < 6) ||
        (gx > 14 && gy < 6) ||
        (gx < 6 && gy > 14);
      const isDark = inFinder
        ? gx === 0 ||
          gx === 5 ||
          gy === 0 ||
          gy === 5 ||
          gx === 15 ||
          gx === 20 ||
          gy === 15 ||
          gy === 20 ||
          (gx % 7 >= 2 && gx % 7 <= 3 && gy % 7 >= 2 && gy % 7 <= 3)
        : (gx * 11 + gy * 17 + gx * gy) % 3 === 0;
      if (isDark) {
        ctx.fillRect(qrX + gx * cell, qrY + gy * cell, cell, cell);
      }
    }
  }

  ctx.font = "8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Shipping/Customer address:", splitX + 4, lTop + 155);
  ctx.fillText("Name: Sample Customer,", splitX + 4, lTop + 166);
  ctx.font = "6.8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sector 4, Salt Lake,", splitX + 4, lTop + 177);
  ctx.fillText("Kolkata District - 700091, IN-WB", splitX + 4, lTop + 190);

  // Sold By row
  ctx.font = "6px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sold By: SELLER STORE, Sample Market Road,", lLeft + 4, lTop + 222);
  ctx.fillText("State: WEST BENGAL, KOLKATA - 700091", lLeft + 4, lTop + 231);
  ctx.fillText("GSTIN: 19SAMPLE0000A1Z1", lLeft + 4, lTop + 240);

  // SKU table
  ctx.strokeRect(lLeft, lTop + 244, lWidth, 49);
  ctx.beginPath();
  ctx.moveTo(lLeft, lTop + 254);
  ctx.lineTo(lLeft + lWidth, lTop + 254);
  ctx.moveTo(lLeft + 9, lTop + 244);
  ctx.lineTo(lLeft + 9, lTop + 293);
  ctx.moveTo(lLeft + lWidth - 20, lTop + 244);
  ctx.lineTo(lLeft + lWidth - 20, lTop + 293);
  ctx.stroke();

  ctx.font = "bold 6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("SKU ID | Description", lLeft + 74, lTop + 251);
  ctx.fillText("QTY", lLeft + lWidth - 17, lTop + 251);
  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("1", lLeft + 3, lTop + 264);
  ctx.fillText("SAMPLE__SKU__ITEM | Sample Seed Packet", lLeft + 12, lTop + 264);
  ctx.fillText("1", lLeft + lWidth - 17, lTop + 264);

  // Bottom AWB + barcode + B2 box
  ctx.font = "7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("FMPC6793824320", lLeft + 11, lTop + 306);
  for (let bx = lLeft + 11; bx < lLeft + lWidth - 52; bx += 2.6) {
    ctx.fillRect(bx, lTop + 311, (Math.round(bx * 3) % 2) === 0 ? 1.5 : 0.8, 26);
  }
  ctx.strokeRect(lLeft + lWidth - 45, lTop + 312, 37, 24);
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("B2", lLeft + lWidth - 34, lTop + 328);

  // Bottom divider & footer text ("Not for resale." | "Printed at ...")
  ctx.beginPath();
  ctx.moveTo(lLeft, lTop + 340);
  ctx.lineTo(lLeft + lWidth, lTop + 340);
  ctx.stroke();
  ctx.font = "bold 6.3px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Not for resale.", lLeft + 3, lTop + 348);
  ctx.fillText("Printed at 1539 hrs, 25/11/26", lLeft + 102, lTop + 348);

  // Exact tear line matching Page 1 (yBottom = 456.5 -> yTop = 385.5)
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(36, 385.5);
  ctx.lineTo(554.3, 385.5);
  ctx.stroke();
  ctx.restore();

  // Tax Invoice section matching Page 1 (yBottom 450.5..119.8 -> yTop 391.5..722.2)
  const bLeft = 36;
  const bTop = 391.5;
  const bWidth = 518;
  ctx.strokeStyle = documentType === "bill" ? "#cbd5e1" : "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(bLeft, bTop + 46);
  ctx.lineTo(bLeft + 412, bTop + 46);
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Tax Invoice", bLeft + 4, bTop + 12);

  ctx.font = "7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Order Id:", bLeft + 74, bTop + 11);
  ctx.font = "bold 7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("OD439237687938616100", bLeft + 74, bTop + 21);
  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Order Date: 24-11-2026", bLeft + 74, bTop + 31);

  ctx.fillText("Invoice No:", bLeft + 190, bTop + 11);
  ctx.font = "bold 7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("NUAAE93270000583", bLeft + 190, bTop + 21);
  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Invoice Date: 24-11-2026", bLeft + 190, bTop + 31);

  ctx.fillText("GSTIN: 19SAMPLE0000A1Z1", bLeft + 298, bTop + 11);
  ctx.fillText("PAN: SAMPLE1234L", bLeft + 298, bTop + 21);

  // Invoice right QR block
  for (let gx = 0; gx < 14; gx++) {
    for (let gy = 0; gy < 14; gy++) {
      if ((gx * 7 + gy * 13 + gx * gy) % 3 === 0) {
        ctx.fillRect(bLeft + 432 + gx * 4, bTop + 14 + gy * 4, 3.2, 3.2);
      }
    }
  }

  // Sold By / Billing / Shipping 3 columns
  ctx.font = "bold 7.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sold By", bLeft + 4, bTop + 60);
  ctx.fillText("Billing Address", bLeft + 136, bTop + 60);
  ctx.fillText("Shipping ADDRESS", bLeft + 286, bTop + 60);

  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("SELLER STORE, Sample Road,", bLeft + 4, bTop + 72);
  ctx.fillText("Kolkata - 700091, West Bengal", bLeft + 4, bTop + 82);
  ctx.fillText("GST: 19SAMPLE0000A1Z1", bLeft + 4, bTop + 106);

  ctx.fillText("Sample Customer", bLeft + 136, bTop + 72);
  ctx.fillText("Sector 4, Salt Lake", bLeft + 136, bTop + 82);
  ctx.fillText("Kolkata - 700091, IN-WB", bLeft + 136, bTop + 92);

  ctx.fillText("Sample Customer", bLeft + 286, bTop + 72);
  ctx.fillText("Sector 4, Salt Lake", bLeft + 286, bTop + 82);
  ctx.fillText("Kolkata - 700091, IN-WB", bLeft + 286, bTop + 92);

  // Product table
  ctx.strokeStyle = documentType === "bill" ? "#334155" : "#64748b";
  ctx.strokeRect(bLeft, bTop + 124, bWidth, 88);
  ctx.beginPath();
  ctx.moveTo(bLeft, bTop + 144);
  ctx.lineTo(bLeft + bWidth, bTop + 144);
  ctx.moveTo(bLeft, bTop + 190);
  ctx.lineTo(bLeft + bWidth, bTop + 190);
  ctx.stroke();

  ctx.font = "bold 7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Product", bLeft + 52, bTop + 137);
  ctx.fillText("Description", bLeft + 178, bTop + 137);
  ctx.fillText("Qty", bLeft + 252, bTop + 137);
  ctx.fillText("Taxable", bLeft + 345, bTop + 137);
  ctx.fillText("Total", bLeft + 478, bTop + 137);

  ctx.font = "6.8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Sample Seed Packet | 1S4J", bLeft + 6, bTop + 160);
  ctx.fillText("HSN: 1209 | IGST: 5%", bLeft + 136, bTop + 160);
  ctx.fillText("1", bLeft + 256, bTop + 160);
  ctx.fillText("113.33", bLeft + 348, bTop + 160);
  ctx.fillText("119.00", bLeft + 476, bTop + 160);

  ctx.font = "bold 7px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("TOTAL QTY: 1", bLeft + 4, bTop + 204);
  ctx.fillText("TOTAL PRICE: 119.00", bLeft + 432, bTop + 201);

  // Seller declaration & Authorized Signature footer (yTop = 720 -> bTop + 328)
  ctx.font = "6.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Seller Registered Address: SELLER STORE, Kolkata - 700091.", bLeft + 4, bTop + 228);
  ctx.fillText("E. & O.E.", bLeft + 4, bTop + 318);
  ctx.font = "8.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Ordered Through", bLeft + 204, bTop + 314);
  ctx.font = "italic bold 8.5px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Flipkart", bLeft + 234, bTop + 329);

  ctx.strokeStyle = "#cbd5e1";
  ctx.strokeRect(bLeft + 448, bTop + 234, 68, 60);
  ctx.font = "8px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("SELLER STORE", bLeft + 452, bTop + 313);
  ctx.fillText("Authorized Signature", bLeft + 436, bTop + 326);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    pageWidthPt: STANDARD_A4_WIDTH,
    pageHeightPt: STANDARD_A4_HEIGHT,
    isFallback: true,
  };
}
