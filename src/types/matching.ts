export interface PageFingerprint {
  id: string;
  fileId: string;
  fileName: string;
  pageIndex: number;
  displayPageNumber: number;
  orderId: string | null;
}

export interface ExtractionProgressCallback {
  (donePages: number, totalPages: number, label: string): void;
}
