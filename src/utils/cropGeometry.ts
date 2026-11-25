import { STANDARD_A4_HEIGHT, STANDARD_A4_WIDTH } from "@/constants/pdf";
import type { CropBoxMargins } from "@/types";
import type { Crop as ReactCropType, PercentCrop } from "react-image-crop";

export type TopLeftBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function boxToTopLeft(
  box: CropBoxMargins,
  pageHeight: number = STANDARD_A4_HEIGHT,
): TopLeftBox {
  const top = Math.max(0, Math.round(pageHeight - box.bottom - box.height));
  return {
    top,
    left: Math.round(box.left),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

export function updateBoxFromTopLeft(
  current: CropBoxMargins,
  field: keyof TopLeftBox,
  rawValue: number,
  pageWidth: number = STANDARD_A4_WIDTH,
  pageHeight: number = STANDARD_A4_HEIGHT,
): CropBoxMargins {
  const currentTop = Math.max(0, Math.round(pageHeight - current.bottom - current.height));

  if (field === "left") {
    const left = Math.max(0, Math.min(pageWidth - 10, Math.round(rawValue)));
    const width = Math.max(10, Math.min(current.width, pageWidth - left));
    return { ...current, left, width };
  }

  if (field === "width") {
    const width = Math.max(10, Math.min(pageWidth - current.left, Math.round(rawValue)));
    return { ...current, width };
  }

  if (field === "top") {
    const top = Math.max(0, Math.min(pageHeight - 10, Math.round(rawValue)));
    const height = Math.max(10, Math.min(current.height, pageHeight - top));
    const bottom = Math.max(0, Math.round(pageHeight - top - height));
    return { ...current, bottom, height };
  }

  // field === "height": keep top edge anchored
  const height = Math.max(10, Math.min(pageHeight - currentTop, Math.round(rawValue)));
  const bottom = Math.max(0, Math.round(pageHeight - currentTop - height));
  return { ...current, bottom, height };
}

export function toPercentCrop(
  box: CropBoxMargins,
  pageW: number,
  pageH: number,
): ReactCropType {
  const x = Math.max(0, Math.min(100, (box.left / pageW) * 100));
  const y = Math.max(
    0,
    Math.min(100, ((pageH - box.bottom - box.height) / pageH) * 100),
  );
  const width = Math.max(1, Math.min(100 - x, (box.width / pageW) * 100));
  const height = Math.max(1, Math.min(100 - y, (box.height / pageH) * 100));
  return { unit: "%", x, y, width, height };
}

export function fromPercentCrop(
  pct: PercentCrop,
  pageW: number,
  pageH: number,
): CropBoxMargins {
  const left = Math.max(0, Math.round((pct.x / 100) * pageW));
  const width = Math.max(10, Math.min(pageW - left, Math.round((pct.width / 100) * pageW)));
  const height = Math.max(10, Math.round((pct.height / 100) * pageH));
  const topOffsetPt = (pct.y / 100) * pageH;
  const bottom = Math.max(
    0,
    Math.min(pageH - height, Math.round(pageH - topOffsetPt - height)),
  );
  return { left, bottom, width, height };
}
