import type { PageFingerprint } from "@/types";

export function extractOrderId(text: string): string | null {
  const longMatch = text.match(/\bOD\d{6,}\b/i);
  if (longMatch) return longMatch[0].toUpperCase();
  const anyOd = text.match(/od\d+/i);
  return anyOd ? anyOd[0].toUpperCase() : null;
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
