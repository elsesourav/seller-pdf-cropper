export type MatchingMethod = "smart" | "od-id" | "fuzzy" | "exact";

export interface PageFingerprint {
  id: string;
  fileId: string;
  fileName: string;
  pageIndex: number;
  displayPageNumber: number;
  orderId: string | null;
  trackingIds: string[];
  /** Compact hash of normalized page text for low-memory exact matching */
  textHash: string;
  hasText: boolean;
  /** Tokenized words only retained when needed for fuzzy matching */
  words: string[] | null;
  snippet: string;
}

export interface ExtractionProgressCallback {
  (donePages: number, totalPages: number, label: string): void;
}
