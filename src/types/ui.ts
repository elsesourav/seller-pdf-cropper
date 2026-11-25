export type AppSection = "cropper" | "compare";

export type ThemeMode = "auto" | "light" | "dark";

export type PdfChunkSizeSetting = "all" | "50" | "100" | "200" | "500";

export type BadgeTone =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface ViewerStatBadge {
  label: string;
  value: string | number;
  tone?: BadgeTone;
}

export interface ProcessingProgress {
  active: boolean;
  percent: number;
  stage: string;
}
