export type DocumentType = "label" | "bill";

export interface CropBoxMargins {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PdfMarginsConfig {
  label: CropBoxMargins;
  bill: CropBoxMargins;
}

export interface CropConfiguration {
  documentType: DocumentType;
  includeSerial: boolean;
  startingSerial: number;
  serialFontSize: number;
  includeUniqueCode: boolean;
  uniqueCode: string;
  clearBottomLine: boolean;
  skipDuplicatePages: boolean;
  margins: PdfMarginsConfig;
}

export interface DuplicatePageInfo {
  fileName: string;
  pageNumber: number;
  matchedKey: string;
}

export interface CropProcessResult {
  blob: Blob;
  fileName: string;
  inputFileCount: number;
  totalInputPages: number;
  duplicatePagesSkipped: number;
  duplicateDetails: DuplicatePageInfo[];
  outputPages: number;
  serialStart?: number;
  serialEnd?: number;
}
