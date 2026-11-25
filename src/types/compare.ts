import type { MatchingMethod, PageFingerprint } from "./matching";
import type { UploadedPdfFile } from "./upload";

export interface CompareSetBucket {
  id: string;
  label: string;
  files: UploadedPdfFile[];
}

export interface CompareOptions {
  matchingMethod: MatchingMethod;
  deduplicateSet1: boolean;
  applyCropAndSerial: boolean;
}

export interface ComparePageResult extends PageFingerprint {
  selected: boolean;
}

export interface CompareSetSummary {
  id: string;
  label: string;
  fileCount: number;
  pageCount: number;
}

export interface CompareProcessResult {
  set1TotalPages: number;
  excludeTotalPages: number;
  setSummaries: CompareSetSummary[];
  excludedCount: number;
  internalDuplicatesRemoved: number;
  uniquePages: ComparePageResult[];
  blob: Blob | null;
  fileName: string;
  isCropped: boolean;
  serialStart?: number;
  serialEnd?: number;
}
