import type { MatchingMethod, PageFingerprint } from "@/types";

export function extractOrderId(text: string): string | null {
  const longMatch = text.match(/\bOD\d{6,}\b/i);
  if (longMatch) return longMatch[0].toUpperCase();
  const anyOd = text.match(/od\d+/i);
  return anyOd ? anyOd[0].toUpperCase() : null;
}

export function extractTrackingIds(text: string): string[] {
  const matches = text.match(/\b(?:FMPP|FMPC|SHP)\d{4,}\b/gi);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.toUpperCase())));
}

export function tokenizeWords(normalizedText: string): string[] {
  const tokens = normalizedText.match(/[a-z0-9]+/g) || [];
  const longTokens = tokens.filter((w) => w.length > 3);
  if (longTokens.length < 4) {
    return tokens;
  }
  return tokens.filter((w) => w.length > 2 || /\d/.test(w));
}

export function fuzzySimilarityMatch(
  wordsA: string[] | null,
  wordsB: string[] | null,
  textHashA: string,
  textHashB: string,
  threshold = 0.8,
): boolean {
  if (textHashA && textHashA === textHashB) return true;
  if (!wordsA || !wordsB || wordsA.length === 0 || wordsB.length === 0) {
    return false;
  }

  const setB = new Set(wordsB);
  let common = 0;
  for (const w of wordsA) {
    if (setB.has(w)) common++;
  }
  const similarity = common / Math.max(wordsA.length, wordsB.length);
  return similarity >= threshold;
}

export function doFingerprintsMatch(
  a: PageFingerprint,
  b: PageFingerprint,
  method: MatchingMethod,
): boolean {
  if (!a.hasText && !b.hasText) return false;

  switch (method) {
    case "exact":
      return a.textHash === b.textHash;

    case "fuzzy":
      return fuzzySimilarityMatch(
        a.words,
        b.words,
        a.textHash,
        b.textHash,
        0.8,
      );

    case "od-id": {
      if (a.orderId && b.orderId) return a.orderId === b.orderId;
      if (a.orderId || b.orderId) return false;
      return fuzzySimilarityMatch(
        a.words,
        b.words,
        a.textHash,
        b.textHash,
        0.8,
      );
    }

    case "smart":
    default: {
      if (a.orderId && b.orderId) return a.orderId === b.orderId;
      if (a.trackingIds.length > 0 && b.trackingIds.length > 0) {
        const bSet = new Set(b.trackingIds);
        if (a.trackingIds.some((id) => bSet.has(id))) return true;
      }
      if (a.orderId || b.orderId) return false;
      return fuzzySimilarityMatch(
        a.words,
        b.words,
        a.textHash,
        b.textHash,
        0.8,
      );
    }
  }
}

/**
 * High-scale matcher index supporting O(1) ID/textHash lookups for 10,000+ pages
 * with fuzzy fallback only for pages that lack structured order/tracking IDs.
 */
export class PageFingerprintMatcher {
  private orderIds = new Set<string>();
  private trackingIds = new Set<string>();
  private textHashes = new Set<string>();
  private fallbackPages: PageFingerprint[] = [];
  private method: MatchingMethod;

  constructor(method: MatchingMethod) {
    this.method = method;
  }

  add(fp: PageFingerprint): void {
    if (!fp.hasText) return;

    if (this.method === "exact") {
      this.textHashes.add(fp.textHash);
      return;
    }

    if (this.method === "fuzzy") {
      this.textHashes.add(fp.textHash);
      this.fallbackPages.push(fp);
      return;
    }

    let hasId = false;
    if (fp.orderId) {
      this.orderIds.add(fp.orderId);
      hasId = true;
    }
    if (this.method === "smart" && fp.trackingIds.length > 0) {
      for (const tid of fp.trackingIds) {
        this.trackingIds.add(tid);
      }
      hasId = true;
    }

    if (!hasId) {
      this.fallbackPages.push(fp);
    }
  }

  hasMatch(fp: PageFingerprint): string | null {
    if (!fp.hasText) return null;

    if (this.method === "exact") {
      return this.textHashes.has(fp.textHash) ? "Exact Text" : null;
    }

    if (this.method === "fuzzy") {
      if (this.textHashes.has(fp.textHash)) return "Exact Text";
      for (const existing of this.fallbackPages) {
        if (
          fuzzySimilarityMatch(
            fp.words,
            existing.words,
            fp.textHash,
            existing.textHash,
            0.8,
          )
        ) {
          return "Fuzzy Match";
        }
      }
      return null;
    }

    if (fp.orderId) {
      if (this.orderIds.has(fp.orderId)) return fp.orderId;
      if (this.method === "smart" && fp.trackingIds.length > 0) {
        const matchedTid = fp.trackingIds.find((id) =>
          this.trackingIds.has(id),
        );
        if (matchedTid) return matchedTid;
      }
      return null;
    }

    if (this.method === "smart" && fp.trackingIds.length > 0) {
      const matchedTid = fp.trackingIds.find((id) => this.trackingIds.has(id));
      if (matchedTid) return matchedTid;
    }

    for (const existing of this.fallbackPages) {
      if (doFingerprintsMatch(fp, existing, this.method)) {
        return existing.orderId || "Similar Page";
      }
    }

    return null;
  }
}
