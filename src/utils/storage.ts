import {
  CROP_CONFIG_STORAGE_KEY,
  DEFAULT_CROP_CONFIG,
  DEFAULT_MARGINS,
} from "@/constants/pdf";
import type { CropConfiguration, PdfMarginsConfig } from "@/types";

function sanitizeInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function sanitizeMargins(raw: unknown): PdfMarginsConfig {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const label =
    obj.label && typeof obj.label === "object"
      ? (obj.label as Record<string, unknown>)
      : {};
  const bill =
    obj.bill && typeof obj.bill === "object"
      ? (obj.bill as Record<string, unknown>)
      : {};

  const rawLabelLeft = sanitizeInt(label.left, DEFAULT_MARGINS.label.left, 0, 2000);
  const rawLabelBottom = sanitizeInt(label.bottom, DEFAULT_MARGINS.label.bottom, 0, 2000);
  const rawLabelWidth = sanitizeInt(label.width, DEFAULT_MARGINS.label.width, 10, 2000);
  const rawLabelHeight = sanitizeInt(label.height, DEFAULT_MARGINS.label.height, 10, 2000);
  const isOutdatedDefaultLabel =
    rawLabelLeft === 188 &&
    rawLabelWidth === 219 &&
    ((rawLabelBottom === 435 && rawLabelHeight === 380) ||
      (rawLabelBottom === 459 && rawLabelHeight === 356));

  return {
    label: isOutdatedDefaultLabel
      ? { ...DEFAULT_MARGINS.label }
      : {
          left: rawLabelLeft,
          bottom: rawLabelBottom,
          width: rawLabelWidth,
          height: rawLabelHeight,
        },
    bill: {
      left: sanitizeInt(bill.left, DEFAULT_MARGINS.bill.left, 0, 2000),
      bottom: sanitizeInt(bill.bottom, DEFAULT_MARGINS.bill.bottom, 0, 2000),
      width: sanitizeInt(bill.width, DEFAULT_MARGINS.bill.width, 10, 2000),
      height: sanitizeInt(bill.height, DEFAULT_MARGINS.bill.height, 10, 2000),
    },
  };
}

function sanitizeUniqueCode(value: unknown): string {
  if (typeof value === "string") {
    const clean = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (clean.length > 0) return clean[0];
  }
  return "A";
}

export function loadCropConfiguration(): CropConfiguration {
  if (typeof window === "undefined") {
    return DEFAULT_CROP_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(CROP_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CROP_CONFIG;
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const documentType = parsed.documentType === "bill" ? "bill" : "label";

    return {
      documentType,
      includeSerial:
        parsed.includeSerial !== undefined
          ? Boolean(parsed.includeSerial)
          : true,
      startingSerial: sanitizeInt(parsed.startingSerial, 1, 1, 999999),
      serialFontSize: sanitizeInt(parsed.serialFontSize, 8, 5, 24),
      includeUniqueCode:
        parsed.includeUniqueCode !== undefined
          ? Boolean(parsed.includeUniqueCode)
          : false,
      uniqueCode: sanitizeUniqueCode(parsed.uniqueCode),
      skipDuplicatePages:
        parsed.skipDuplicatePages !== undefined
          ? Boolean(parsed.skipDuplicatePages)
          : true,
      margins: sanitizeMargins(parsed.margins),
    };
  } catch {
    return DEFAULT_CROP_CONFIG;
  }
}

export function saveCropConfiguration(config: CropConfiguration): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CROP_CONFIG_STORAGE_KEY,
      JSON.stringify(config),
    );
  } catch {
    // Ignore storage quota or private mode failures
  }
}
