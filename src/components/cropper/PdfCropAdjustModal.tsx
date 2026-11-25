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
import {
  boxToTopLeft,
  fromPercentCrop,
  toPercentCrop,
  updateBoxFromTopLeft,
  type TopLeftBox,
} from "@/utils/cropGeometry";
import {
  Button,
  Modal,
  SegmentedControl,
  Select,
  Spinner,
} from "@elsesourav/react-ui";
import {
  Check,
  Crop,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactCrop, {
  type Crop as ReactCropType,
  type PercentCrop,
} from "react-image-crop";

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
  const [editingType, setEditingType] = useState<DocumentType>(documentType);
  const activeSavedBox = currentMargins?.[editingType] || DEFAULT_MARGINS[editingType];

  const [box, setBox] = useState<CropBoxMargins>(activeSavedBox);
  const [selectedFileId, setSelectedFileId] = useState<string>("auto");
  const [preview, setPreview] = useState<PdfPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const [crop, setCrop] = useState<ReactCropType>();
  const [justSaved, setJustSaved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 300,
    height: 400,
  });

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

  const pageWidthPt = preview?.pageWidthPt || STANDARD_A4_WIDTH;
  const pageHeightPt = preview?.pageHeightPt || STANDARD_A4_HEIGHT;
  const topLeftBox = useMemo(
    () => boxToTopLeft(box, pageHeightPt),
    [box, pageHeightPt],
  );

  // Measure container width AND height for distortion-free Fit + Zoom on mobile & desktop
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const computed = window.getComputedStyle(el);
      const padX =
        (parseFloat(computed.paddingLeft) || 8) +
        (parseFloat(computed.paddingRight) || 8);
      const padY =
        (parseFloat(computed.paddingTop) || 8) +
        (parseFloat(computed.paddingBottom) || 8);
      const availW = Math.max(120, el.clientWidth - padX);
      const availH = Math.max(120, el.clientHeight - padY);
      setContainerSize({ width: availW, height: availH });
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, preview]);

  // Sync editingType when modal opens
  useEffect(() => {
    if (!open) return;
    setEditingType(documentType);
    const vals = currentMargins?.[documentType] || DEFAULT_MARGINS[documentType];
    setBox(vals);
    setZoom(1);
    setJustSaved(false);
  }, [open, documentType]);

  // Sync box & ReactCrop when switching Label/Bill tab inside modal or preview loads
  useEffect(() => {
    if (!open) return;
    const vals = currentMargins?.[editingType] || DEFAULT_MARGINS[editingType];
    setBox(vals);
    if (preview) {
      setCrop(toPercentCrop(vals, pageWidthPt, pageHeightPt));
    }
  }, [editingType, open, preview, pageWidthPt, pageHeightPt]);

  const loadPreview = useCallback(async () => {
    if (!open) return;

    if (!activeFile) {
      setPreview(generateFallbackLabelPreviewData(editingType));
      return;
    }

    setIsLoadingPreview(true);
    try {
      const rendered = await renderPdfPagePreview(activeFile.file, 1, 2);
      setPreview(rendered);
    } catch {
      setPreview(generateFallbackLabelPreviewData(editingType));
    } finally {
      setIsLoadingPreview(false);
    }
  }, [activeFile, editingType, open]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const persistMargins = useCallback(
    (nextBox: CropBoxMargins) => {
      setBox(nextBox);
      onSave({
        ...currentMargins,
        [editingType]: nextBox,
      });
      setJustSaved(true);
    },
    [currentMargins, editingType, onSave],
  );

  const handleManualField = (field: keyof TopLeftBox, raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const nextBox = updateBoxFromTopLeft(
      box,
      field,
      parsed,
      pageWidthPt,
      pageHeightPt,
    );
    persistMargins(nextBox);
    setCrop(toPercentCrop(nextBox, pageWidthPt, pageHeightPt));
  };

  const handleCropChange = (_pixelCrop: unknown, percentCrop: PercentCrop) => {
    setCrop(percentCrop);
    if (percentCrop.width > 0 && percentCrop.height > 0) {
      setBox(fromPercentCrop(percentCrop, pageWidthPt, pageHeightPt));
    }
  };

  const handleCropComplete = (_pixelCrop: unknown, percentCrop: PercentCrop) => {
    if (percentCrop.width <= 0 || percentCrop.height <= 0) return;
    const nextBox = fromPercentCrop(percentCrop, pageWidthPt, pageHeightPt);
    persistMargins(nextBox);
    setCrop(toPercentCrop(nextBox, pageWidthPt, pageHeightPt));
  };

  const handleReset = () => {
    const defaults = DEFAULT_MARGINS[editingType];
    persistMargins(defaults);
    setCrop(toPercentCrop(defaults, pageWidthPt, pageHeightPt));
  };

  const fitScale = Math.min(
    containerSize.width / pageWidthPt,
    containerSize.height / pageHeightPt,
  );
  const displayWidth = Math.max(120, Math.round(pageWidthPt * fitScale * zoom));
  const displayHeight = Math.max(120, Math.round(pageHeightPt * fitScale * zoom));

  const fileOptions = useMemo(
    () =>
      previewCandidateFiles.map((f) => ({
        value: f.id,
        label: f.name,
        hint: `${f.pageCount}p`,
      })),
    [previewCandidateFiles],
  );

  const manualFields: Array<{
    key: keyof TopLeftBox;
    label: string;
    min: number;
    max: number;
  }> = [
    { key: "top", label: "Top", min: 0, max: pageHeightPt - 10 },
    { key: "left", label: "Left", min: 0, max: pageWidthPt - 10 },
    { key: "width", label: "Width", min: 10, max: pageWidthPt },
    { key: "height", label: "Height", min: 10, max: pageHeightPt },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Crop className="h-4 w-4" />
          </div>
          <span>Crop Area Preset</span>
        </div>
      }
      maxWidth="min(1040px, 97vw)"
      maxHeight="94dvh"
      className="flex h-[90dvh] flex-col sm:h-[94dvh]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            {justSaved ? (
              <span className="inline-flex items-center gap-1 font-sans font-semibold text-success">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : (
              <span>
                {pageWidthPt}×{pageHeightPt} pt
              </span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Reset Default
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
        {/* Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Crop Preset Type"
              value={editingType}
              onValueChange={(val) => setEditingType(val as DocumentType)}
              options={[
                { value: "label", label: "Label" },
                { value: "bill", label: "Bill" },
              ]}
            />

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
              <span className="min-w-[42px] select-none text-center font-mono text-xs font-bold text-foreground">
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

            {previewCandidateFiles.length > 1 && (
              <div className="w-40 sm:w-52">
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

        {/* Interactive Crop Canvas */}
        <div
          ref={containerRef}
          className="pdf-crop-wrapper custom-scrollbar relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-2xl border border-border bg-surface-sunken/70 p-2 sm:p-3"
        >
          {isLoadingPreview ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <Spinner size="lg" />
              <p className="text-xs font-medium text-muted-foreground">
                Rendering preview...
              </p>
            </div>
          ) : preview?.dataUrl ? (
            <div
              className="relative m-auto shrink-0"
              style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
            >
              <ReactCrop
                crop={crop}
                onChange={handleCropChange}
                onComplete={handleCropComplete}
                className="block"
                style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
              >
                <img
                  src={preview.dataUrl}
                  alt="PDF Page Crop Preview"
                  className="block rounded-sm bg-white shadow-float select-none"
                  style={{
                    width: `${displayWidth}px`,
                    height: `${displayHeight}px`,
                    maxWidth: "none",
                  }}
                />
              </ReactCrop>
            </div>
          ) : null}
        </div>

        {/* Compact Top / Left / Width / Height Numeric Inputs */}
        <div className="grid shrink-0 grid-cols-4 gap-2 rounded-xl border border-border bg-surface-elevated/60 p-2 sm:gap-3 sm:p-2.5">
          {manualFields.map(({ key, label, min, max }) => (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`crop-${key}`}
                className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </label>
              <input
                id={`crop-${key}`}
                type="number"
                inputMode="numeric"
                min={min}
                max={max}
                value={topLeftBox[key]}
                onChange={(e) => handleManualField(key, e.target.value)}
                aria-label={`Crop ${label}`}
                className="h-8 w-full rounded-lg border border-border bg-surface px-1 text-center font-mono text-xs font-bold text-foreground shadow-well focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
