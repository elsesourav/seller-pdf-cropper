import type {
  DuplicatePageInfo,
  PageFingerprint,
  UploadedPdfFile,
} from "@/types";

export function extractOrderId(text: string): string | null {
  const longMatch = text.match(/\bOD\d{6,}\b/i);
  if (longMatch) return longMatch[0].toUpperCase();

  const spacedOdMatch = text.match(/\bOD\s+(\d{6,})\b/i);
  if (spacedOdMatch) return `OD${spacedOdMatch[1]}`;

  const anyOd = text.match(/\bOD\d+\b/i);
  if (anyOd) return anyOd[0].toUpperCase();

  // Rescue split text spans (e.g., "OD 4392 37687938616100") without false positives
  const compactMatch = text.replace(/\s+/g, "").match(/OD(\d{10,24})/i);
  if (compactMatch) return `OD${compactMatch[1]}`;

  const labeledOrder = text.match(
    /\bOrder\s*(?:ID|No\.?|Number)?\s*[:#-]?\s*([A-Z0-9-]{6,})\b/i,
  );
  if (labeledOrder?.[1] && /\d{4,}/.test(labeledOrder[1])) {
    return labeledOrder[1].toUpperCase();
  }

  return null;
}

/**
 * O(1) Order-ID index supporting 10,000+ pages with minimal memory overhead.
 */
export class PageFingerprintMatcher {
  private orderIds = new Set<string>();

  add(fp: PageFingerprint): void {
    if (fp.orderId) {
      this.orderIds.add(fp.orderId);
    }
  }

  hasMatch(fp: PageFingerprint): string | null {
    if (!fp.orderId) return null;
    return this.orderIds.has(fp.orderId) ? fp.orderId : null;
  }
}

/**
 * Keeps only the first occurrence of every Order ID across all uploaded files AND
 * across pages inside each individual file, preserving original file/page order.
 */
export function filterUniqueOrderPages(
  files: UploadedPdfFile[],
  fingerprintsByKey: Map<string, PageFingerprint>,
): {
  keptPagesByFile: Map<string, number[]>;
  keptTotal: number;
  duplicateDetails: DuplicatePageInfo[];
} {
  const seenMatcher = new PageFingerprintMatcher();
  const duplicateDetails: DuplicatePageInfo[] = [];
  const keptPagesByFile = new Map<string, number[]>();
  let keptTotal = 0;

  for (const file of files) {
    for (let idx = 0; idx < file.pageCount; idx++) {
      const fp = fingerprintsByKey.get(`${file.id}:${idx}`);
      if (fp) {
        const matchedKey = seenMatcher.hasMatch(fp);
        if (matchedKey) {
          duplicateDetails.push({
            fileName: file.name,
            pageNumber: idx + 1,
            matchedKey,
          });
          continue;
        }
        seenMatcher.add(fp);
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

  return { keptPagesByFile, keptTotal, duplicateDetails };
}
