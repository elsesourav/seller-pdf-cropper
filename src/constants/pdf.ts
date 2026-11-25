import type { CropConfiguration, PdfMarginsConfig } from "@/types";

export const STANDARD_A4_WIDTH = 595;
export const STANDARD_A4_HEIGHT = 842;

export const CROP_CONFIG_STORAGE_KEY = "seller_pdf_cropper_config_v2";

/** Fixed white backdrop padding behind bottom-left Unique Code and bottom-right Serial */
export const TEXT_BG_PADDING_X = 3;
export const TEXT_BG_PADDING_Y = 1;

/** Bounded concurrency & UI-yield intervals tuned for 5,000–10,000 PDFs */
export const UPLOAD_INSPECT_CONCURRENCY = 10;
export const PDF_TEXT_CONCURRENCY = 6;
export const UI_YIELD_INTERVAL = 40;

export const DEFAULT_MARGINS: PdfMarginsConfig = {
  label: { left: 188, bottom: 459, width: 219, height: 356 },
  bill: { left: 30, bottom: 70, width: 535, height: 390 },
};

export const DEFAULT_CROP_CONFIG: CropConfiguration = {
  documentType: "label",
  includeSerial: true,
  startingSerial: 1,
  serialFontSize: 8,
  includeUniqueCode: false,
  uniqueCode: "A",
  skipDuplicatePages: true,
  margins: DEFAULT_MARGINS,
};
