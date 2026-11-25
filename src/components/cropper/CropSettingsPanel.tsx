import { MATCH_METHOD_ITEMS } from "@/constants/matching";
import type {
  CropConfiguration,
  DocumentType,
  MatchingMethod,
} from "@/types";
import {
  Badge,
  Button,
  Card,
  Select,
  SquishSwitch,
} from "@elsesourav/react-ui";
import { CopyCheck, Crop, Hash, ReceiptText, Tag } from "lucide-react";
import { NumberStepper } from "../common/NumberStepper";

interface CropSettingsPanelProps {
  config: CropConfiguration;
  onUpdate: (partial: Partial<CropConfiguration>) => void;
  onOpenCropAdjust: () => void;
  isCompareOutputMode?: boolean;
  totalOutputPagesPreview?: number;
}

export function CropSettingsPanel({
  config,
  onUpdate,
  onOpenCropAdjust,
  isCompareOutputMode = false,
  totalOutputPagesPreview = 0,
}: CropSettingsPanelProps) {
  const activeMargins = config.margins[config.documentType];

  const selectDocType = (docType: DocumentType) => {
    onUpdate({ documentType: docType });
  };

  const serialRangeText =
    config.includeSerial && totalOutputPagesPreview > 0
      ? `#${config.startingSerial.toLocaleString()} → #${(config.startingSerial + totalOutputPagesPreview - 1).toLocaleString()}`
      : null;

  return (
    <div className="space-y-3">
      {/* Crop Type & Interactive Crop Area Trigger */}
      <Card variant="default" className="space-y-3 border-border/80 bg-card/95 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Crop Type
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {activeMargins.width}×{activeMargins.height}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => selectDocType("label")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all sm:text-sm ${
              config.documentType === "label"
                ? "border-primary bg-primary text-primary-foreground shadow-lift"
                : "border-border bg-surface-elevated/60 text-foreground/80 hover:border-border-strong hover:text-foreground"
            }`}
          >
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span>Label</span>
          </button>

          <button
            type="button"
            onClick={() => selectDocType("bill")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all sm:text-sm ${
              config.documentType === "bill"
                ? "border-primary bg-primary text-primary-foreground shadow-lift"
                : "border-border bg-surface-elevated/60 text-foreground/80 hover:border-border-strong hover:text-foreground"
            }`}
          >
            <ReceiptText className="h-3.5 w-3.5 shrink-0" />
            <span>Bill</span>
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Crop className="h-3.5 w-3.5 text-primary" />}
          onClick={onOpenCropAdjust}
          className="w-full"
        >
          Adjust Crop
        </Button>
      </Card>

      {/* Serial Number & Size */}
      <Card variant="default" className="space-y-3 border-border/80 bg-card/95 p-3.5 sm:p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onUpdate({ includeSerial: !config.includeSerial })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onUpdate({ includeSerial: !config.includeSerial });
            }
          }}
          className="flex cursor-pointer items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Serial Number</p>
            {serialRangeText && (
              <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                {serialRangeText}
              </Badge>
            )}
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <SquishSwitch
              checked={config.includeSerial}
              onChange={(checked) => onUpdate({ includeSerial: checked })}
              size="md"
              variant="primary"
              ariaLabel="Toggle Serial Number"
            />
          </div>
        </div>

        {config.includeSerial && (
          <div className="space-y-2 border-t border-border/70 pt-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-subtle/60 px-3 py-2">
                <label
                  htmlFor="serial-start-input"
                  className="text-xs font-semibold text-foreground"
                >
                  Start From
                </label>
                <NumberStepper
                  id="serial-start-input"
                  value={config.startingSerial}
                  min={1}
                  max={999999}
                  onChange={(val) => onUpdate({ startingSerial: val })}
                  ariaLabel="Starting serial number"
                />
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-subtle/60 px-3 py-2">
                <label
                  htmlFor="serial-size-input"
                  className="text-xs font-semibold text-foreground"
                >
                  Size
                </label>
                <NumberStepper
                  id="serial-size-input"
                  value={config.serialFontSize}
                  min={5}
                  max={24}
                  unit="pt"
                  onChange={(val) => onUpdate({ serialFontSize: val })}
                  ariaLabel="Serial number font size"
                />
              </div>
            </div>

            {config.documentType === "label" && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onUpdate({ clearBottomLine: !config.clearBottomLine })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onUpdate({ clearBottomLine: !config.clearBottomLine });
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface-subtle/40 px-3 py-2 select-none"
              >
                <span className="text-xs font-medium text-foreground/90">
                  Clean bottom line
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <SquishSwitch
                    checked={config.clearBottomLine}
                    onChange={(checked) => onUpdate({ clearBottomLine: checked })}
                    size="sm"
                    variant="primary"
                    ariaLabel="Clean bottom line"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Duplicate Page Protection */}
      {!isCompareOutputMode && (
        <Card variant="default" className="space-y-3 border-border/80 bg-card/95 p-3.5 sm:p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              onUpdate({ skipDuplicatePages: !config.skipDuplicatePages })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onUpdate({ skipDuplicatePages: !config.skipDuplicatePages });
              }
            }}
            className="flex cursor-pointer items-center justify-between gap-3 select-none"
          >
            <div className="flex items-center gap-2">
              <CopyCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-bold text-foreground">Skip Duplicates</p>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <SquishSwitch
                checked={config.skipDuplicatePages}
                onChange={(checked) => onUpdate({ skipDuplicatePages: checked })}
                size="md"
                variant="success"
                ariaLabel="Toggle skip duplicate pages"
              />
            </div>
          </div>

          {config.skipDuplicatePages && (
            <div className="border-t border-border/70 pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Rule
                </span>
                <div className="w-44 sm:w-48">
                  <Select
                    variant="animated"
                    items={MATCH_METHOD_ITEMS}
                    value={config.duplicateMatchMethod}
                    onChange={(val) =>
                      onUpdate({ duplicateMatchMethod: val as MatchingMethod })
                    }
                    fullWidth
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
