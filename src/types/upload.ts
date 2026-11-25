export interface UploadedPdfFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  hash: string;
}

export interface InspectPdfBatchResult {
  added: UploadedPdfFile[];
  duplicates: string[];
  invalid: string[];
}

export interface UploadInspectProgress {
  processed: number;
  total: number;
  currentFileName: string;
}

export interface PdfPreviewData {
  dataUrl: string;
  pageWidthPt: number;
  pageHeightPt: number;
  isFallback: boolean;
}

export interface RenderedPageThumbnail {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}
