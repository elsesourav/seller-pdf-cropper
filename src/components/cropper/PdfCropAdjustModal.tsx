import {
  DEFAULT_MARGINS,
  STANDARD_A4_HEIGHT,
  STANDARD_A4_WIDTH,
} from "@/constants/pdf";
import {
  generateFallbackLabelPreviewData,
  renderPdfPagePreview,
} from "@/services/pdf/preview";
import type {
  CropBoxMargins,
  DocumentType,
  PdfMarginsConfig,
  PdfPreviewData,
  UploadedPdfFile,
} from "@/types";
import { Badge, Button, Modal, Select, Spinner } from "@elsesourav/react-ui";
import { Crop, RotateCcw, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, {
  type Crop as ReactCropType,
  type PercentCrop,
} from "react-image-crop";
import { NumberStepper } from "../common/NumberStepper";

interface PdfCropAdjustModalProps {
  open: boolean;
  onClose: () => void;
  documentType: DocumentType;
  currentMargins: PdfMarginsConfig;
  onSave: (margins: PdfMarginsConfig) => void;
  uploadedFiles: UploadedPdfFile[];
}

export function PdfCropAdjustModal({
  open,
  onClose,
  documentType,
  currentMargins,
  onSave,
  uploadedFiles,
}: PdfCropAdjustModalProps) {
  const defaultValues = DEFAULT_MARGINS[documentType];
  const initialValues = currentMargins?.[documentType] || defaultValues;

  const [left, setLeft] = useState(initialValues.left);
  const [bottom, setBottom] = useState(initialValues.bottom);
  const [width, setWidth] = useState(initialValues.width);
  const [height, setHeight] = useState(initialValues.height);

  const [selectedFileId, setSelectedFileId] = useState<string>("auto");
  const [preview, setPreview] = useState<PdfPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [crop, setCrop] = useState<ReactCropType>();
  const [showManual, setShowManual] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerInnerHeight, setContainerInnerHeight] = useState<number>(0);

  const previewCandidateFiles = useMemo(
    () => uploadedFiles.slice(0, 50),
    [uploadedFiles],
  );

  const activeFile = useMemo(() => {
    if (!previewCandidateFiles.length) return null;
    if (selectedFileId === "auto") return previewCandidateFiles[0];
    return (
      previewCandidateFiles.find((f) => f.id === selectedFileId) ||
      previewCandidateFiles[0]
    );
  }, [selectedFileId, previewCandidateFiles]);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const computed = window.getComputedStyle(el);
      const padTop = parseFloat(computed.paddingTop) || 12;
      const padBottom = parseFloat(computed.paddingBottom) || 12;
      const availableH = el.clientHeight - padTop - padBottom;
      if (availableH > 80) {
        setContainerInnerHeight(availableH);
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, preview, showManual]);

  useEffect(() => {
    if (!open) return;
    const vals = currentMargins?.[documentType] || DEFAULT_MARGINS[documentType];
    setLeft(vals.left);
    setBottom(vals.bottom);
    setWidth(vals.width);
    setHeight(vals.height);
    setZoom(1);
    setCrop(undefined);
    if (!uploadedFiles.length) {
      setShowManual(true);
    }
  }, [open, currentMargins, documentType, uploadedFiles.length]);

  const loadPreview = useCallback(async () => {
    if (!open) return;

    if (!activeFile) {
      setPreview(generateFallbackLabelPreviewData(documentType));
      return;
    }

    setIsLoadingPreview(true);
    try {
      const rendered = await renderPdfPagePreview(activeFile.file, 1, 2);
      setPreview(rendered);
    } catch {
      setPreview(generateFallbackLabelPreviewData(documentType));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [activeFile, documentType, open]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const pageWidthPt = preview?.pageWidthPt || STANDARD_A4_WIDTH;
  const pageHeightPt = preview?.pageHeightPt || STANDARD_A4_HEIGHT;

  useEffect(() => {
    if (!preview) return;
    const xPct = Math.max(0, Math.min(100, (left / pageWidthPt) * 100));
    const yPct = Math.max(
      0,
      Math.min(100, ((pageHeightPt - bottom - height) / pageHeightPt) * 100),
    );
    const wPct = Math.max(1, Math.min(100 - xPct, (width / pageWidthPt) * 100));
    const hPct = Math.max(1, Math.min(100 - yPct, (height / pageHeightPt) * 100));

    setCrop({ unit: "%", x: xPct, y: yPct, width: wPct, height: hPct });
  }, [left, bottom, width, height, preview, pageWidthPt, pageHeightPt]);

  const handleCropComplete = (_pixelCrop: unknown, percentCrop: PercentCrop) => {
    if (percentCrop.width <= 0 || percentCrop.height <= 0) return;

    const newLeft = Math.round((percentCrop.x / 100) * pageWidthPt);
    const newWidth = Math.max(
      10,
      Math.round((percentCrop.width / 100) * pageWidthPt),
    );
    const newHeight = Math.max(
      10,
      Math.round((percentCrop.height / 100) * pageHeightPt),
    );
    const topOffsetPt = (percentCrop.y / 100) * pageHeightPt;
    const newBottom = Math.max(0, Math.round(pageHeightPt - topOffsetPt - newHeight));

    setLeft(newLeft);
    setWidth(newWidth);
    setHeight(newHeight);
    setBottom(newBottom);
  };

  const handleReset = () => {
    setLeft(defaultValues.left);
    setBottom(defaultValues.bottom);
    setWidth(defaultValues.width);
    setHeight(defaultValues.height);
  };

  const handleSave = () => {
    const nextBox: CropBoxMargins = {
      left: Math.max(0, left),
      bottom: Math.max(0, bottom),
      width: Math.max(10, width),
      height: Math.max(10, height),
    };
    onSave({
      ...currentMargins,
      [documentType]: nextBox,
    });
    onClose();
  };

  const fileOptions = useMemo(
    () =>
      previewCandidateFiles.map((f) => ({
        value: f.id,
        label: f.name,
        hint: `${f.pageCount}p`,
      })),
    [previewCandidateFiles],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Crop className="h-4 w-4" />
          </div>
          <span>
            Crop Area — {documentType === "bill" ? "Invoice / Bill" : "Shipping Label"}
          </span>
        </div>
      }
      maxWidth="min(960px, 96vw)"
      maxHeight="94dvh"
      className="flex flex-col"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
            Page: {pageWidthPt}×{pageHeightPt} pt{" "}
            {preview?.isFallback ? "(Template)" : ""}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSave}>
              Save Crop
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex h-[70dvh] min-h-[360px] flex-col gap-2.5 overflow-hidden sm:h-[72dvh]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-border bg-surface-elevated p-0.5 shadow-well">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={zoom <= 0.5}
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="h-7 w-7 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="min-w-[44px] select-none text-center font-mono text-xs font-bold text-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={zoom >= 3}
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="h-7 w-7 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <div className="mx-1 h-4 w-px bg-border" />
              <button
                type="button"
                onClick={() => setZoom(1)}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                  zoom === 1
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fit
              </button>
            </div>

            <Badge variant="outline" size="sm" className="hidden font-mono sm:inline-flex">
              {width}×{height} • L:{left} B:{bottom}
            </Badge>

            {previewCandidateFiles.length > 1 && (
              <div className="w-44 sm:w-56">
                <Select
                  variant="animated"
                  items={fileOptions}
                  value={activeFile?.id || ""}
                  onChange={(val) => setSelectedFileId(val)}
                  placeholder="Preview PDF"
                  fullWidth
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={showManual ? "primary" : "outline"}
              size="xs"
              leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              onClick={() => setShowManual((v) => !v)}
            >
              Manual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="pdf-crop-wrapper custom-scrollbar relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-2xl border border-border bg-surface-sunken/70 p-2 sm:p-4"
        >
          {isLoadingPreview ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs font-medium text-muted-foreground">
                Rendering first PDF page...
              </p>
            </div>
          ) : preview?.dataUrl ? (
            <div
              className="relative m-auto flex items-center justify-center transition-[height] duration-150"
              style={{
                height:
                  containerInnerHeight > 0
                    ? `${Math.round(containerInnerHeight * zoom)}px`
                    : undefined,
              }}
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={handleCropComplete}
                className="block"
                style={{
                  height:
                    containerInnerHeight > 0
                      ? `${Math.round(containerInnerHeight * zoom)}px`
                      : undefined,
                }}
              >
                <img
                  src={preview.dataUrl}
                  alt="PDF Page Crop Preview"
                  className="block rounded-sm bg-white object-contain shadow-float select-none"
                  style={{
                    height:
                      containerInnerHeight > 0
                        ? `${Math.round(containerInnerHeight * zoom)}px`
                        : undefined,
                    width: "auto",
                  }}
                />
              </ReactCrop>
            </div>
          ) : null}
        </div>

        {showManual && (
          <div className="grid shrink-0 grid-cols-2 gap-2.5 rounded-xl border border-border bg-surface-elevated/60 p-3 sm:grid-cols-4 sm:gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="crop-left"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Left (pt)
              </label>
              <NumberStepper
                id="crop-left"
                value={left}
                min={0}
                max={pageWidthPt - 10}
                onChange={setLeft}
                ariaLabel="Left margin"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="crop-bottom"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Bottom (pt)
              </label>
              <NumberStepper
                id="crop-bottom"
                value={bottom}
                min={0}
                max={pageHeightPt - 10}
                onChange={setBottom}
                ariaLabel="Bottom margin"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="crop-width"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Width (pt)
              </label>
              <NumberStepper
                id="crop-width"
                value={width}
                min={10}
                max={pageWidthPt}
                onChange={setWidth}
                ariaLabel="Crop width"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="crop-height"
                className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Height (pt)
              </label>
              <NumberStepper
                id="crop-height"
                value={height}
                min={10}
                max={pageHeightPt}
                onChange={setHeight}
                ariaLabel="Crop height"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
