import { Button } from "@elsesourav/react-ui";
import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function NumberStepper({
  id,
  value,
  min = 1,
  max = 999999,
  step = 1,
  unit,
  onChange,
  disabled = false,
  ariaLabel,
}: NumberStepperProps) {
  const clamp = (val: number) => Math.max(min, Math.min(max, Math.round(val)));

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || value <= min}
        onClick={(e) => {
          e.stopPropagation();
          onChange(clamp(value - step));
        }}
        className="h-8 w-8 rounded-lg border-border/80 bg-surface-elevated"
        aria-label={`Decrease ${ariaLabel || "value"}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) {
            onChange(clamp(parsed));
          }
        }}
        className="h-8 w-16 rounded-lg border border-border bg-surface px-1.5 text-center font-mono text-sm font-bold text-foreground shadow-well focus:border-border-strong focus:outline-none disabled:opacity-50"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled || value >= max}
        onClick={(e) => {
          e.stopPropagation();
          onChange(clamp(value + step));
        }}
        className="h-8 w-8 rounded-lg border-border/80 bg-surface-elevated"
        aria-label={`Increase ${ariaLabel || "value"}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {unit && (
        <span className="pl-0.5 font-mono text-xs font-semibold text-muted-foreground">
          {unit}
        </span>
      )}
    </div>
  );
}
