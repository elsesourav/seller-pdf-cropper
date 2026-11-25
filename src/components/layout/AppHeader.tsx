import { useThemeMode } from "@/components/common/SafeThemeProvider";
import type { AppSection, ThemeMode } from "@/types";
import { SegmentedControl } from "@elsesourav/react-ui";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  cropperFileCount: number;
  compareFileCount: number;
}

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppHeader({
  activeSection,
  onSectionChange,
  cropperFileCount,
  compareFileCount,
}: AppHeaderProps) {
  const { themeMode, setThemeMode } = useThemeMode();

  const sectionOptions = [
    {
      value: "cropper",
      label: cropperFileCount > 0 ? `PDF Cropper (${cropperFileCount})` : "PDF Cropper",
    },
    {
      value: "compare",
      label: compareFileCount > 0 ? `Compare PDFs (${compareFileCount})` : "Compare PDFs",
    },
  ];

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

          <div className="shrink-0 sm:hidden">
            <SegmentedControl
              variant="primary"
              label="Theme mode"
              value={themeMode}
              onValueChange={(val) => setThemeMode(val as ThemeMode)}
              options={THEME_OPTIONS}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:justify-end">
          <SegmentedControl
            variant="primary"
            label="PDF Tools Navigation"
            value={activeSection}
            onValueChange={(val) => onSectionChange(val as AppSection)}
            options={sectionOptions}
            className="block w-full sm:inline-block sm:w-auto"
          />

          <div className="hidden shrink-0 sm:block">
            <SegmentedControl
              variant="primary"
              label="Theme mode"
              value={themeMode}
              onValueChange={(val) => setThemeMode(val as ThemeMode)}
              options={THEME_OPTIONS}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
