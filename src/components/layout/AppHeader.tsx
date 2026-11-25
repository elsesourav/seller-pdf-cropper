import { useThemeMode } from "@/components/common/SafeThemeProvider";
import type { AppSection, ThemeMode } from "@/types";
import { Tabs } from "@elsesourav/react-ui";
import { Crop, GitCompareArrows, Monitor, Moon, Sun } from "lucide-react";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  cropperFileCount: number;
  compareFileCount: number;
}

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  Icon: typeof Monitor;
}> = [
  { mode: "auto", label: "Auto", Icon: Monitor },
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
];

export function AppHeader({
  activeSection,
  onSectionChange,
  cropperFileCount,
  compareFileCount,
}: AppHeaderProps) {
  const { themeMode, setThemeMode } = useThemeMode();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="./icon.png"
              alt="Seller PDF Cropper"
              className="h-8 w-8 shrink-0 rounded-lg border border-border/70 bg-surface-elevated object-cover"
            />
            <h1 className="truncate font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
              Seller PDF Cropper
            </h1>
          </div>

          <div
            role="radiogroup"
            aria-label="Theme mode"
            className="inline-flex shrink-0 items-center rounded-lg border border-border bg-surface-subtle p-0.5 sm:hidden"
          >
            {THEME_OPTIONS.map(({ mode, label }) => {
              const active = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setThemeMode(mode)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          <Tabs
            variant="pills"
            value={activeSection}
            onValueChange={(val) => onSectionChange(val as AppSection)}
            label="PDF Tools Navigation"
            className="w-full sm:w-auto"
            items={[
              {
                value: "cropper",
                label: "PDF Cropper",
                icon: <Crop className="h-3.5 w-3.5" />,
                badge: cropperFileCount > 0 ? cropperFileCount : undefined,
              },
              {
                value: "compare",
                label: "Compare PDFs",
                icon: <GitCompareArrows className="h-3.5 w-3.5" />,
                badge: compareFileCount > 0 ? compareFileCount : undefined,
              },
            ]}
          />

          <div
            role="radiogroup"
            aria-label="Theme mode"
            className="hidden shrink-0 items-center rounded-xl border border-border bg-surface-subtle p-0.5 sm:inline-flex"
          >
            {THEME_OPTIONS.map(({ mode, label, Icon }) => {
              const active = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setThemeMode(mode)}
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
