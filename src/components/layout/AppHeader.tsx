import { useThemeMode } from "@/components/common/SafeThemeProvider";
import type { AppSection, ThemeMode } from "@/types";
import { Button, SegmentedControl } from "@elsesourav/react-ui";
import { Monitor, Moon, Sun } from "lucide-react";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  cropperFileCount: number;
  compareFileCount: number;
}

const THEME_META: Record<
  ThemeMode,
  { title: string; Icon: typeof Monitor }
> = {
  auto: { title: "Theme: Auto (System)", Icon: Monitor },
  light: { title: "Theme: Light", Icon: Sun },
  dark: { title: "Theme: Dark", Icon: Moon },
};

export function AppHeader({
  activeSection,
  onSectionChange,
  cropperFileCount,
  compareFileCount,
}: AppHeaderProps) {
  const { themeMode, cycleThemeMode } = useThemeMode();
  const { title, Icon } = THEME_META[themeMode];

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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2.5 px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="./icon.png"
            alt="Seller PDF Cropper"
            className="h-8 w-8 shrink-0 rounded-lg border border-border/70 bg-surface-elevated object-cover transition-transform duration-200 hover:scale-105"
          />
          <h1 className="truncate font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
            Seller PDF Cropper
          </h1>
        </div>

        <div className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto">
          <SegmentedControl
            variant="primary"
            label="PDF Tools Navigation"
            value={activeSection}
            onValueChange={(val) => onSectionChange(val as AppSection)}
            options={sectionOptions}
            className="block w-full sm:inline-block sm:w-auto"
          />
        </div>

        <div className="order-2 shrink-0 sm:order-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={(e) => cycleThemeMode(e)}
            title={title}
            aria-label="Change theme"
            data-theme-mode={themeMode}
            className="h-9 w-9 rounded-xl border-border/80 bg-surface-elevated/80"
          >
            <Icon className="h-4 w-4 transition-transform duration-200" />
          </Button>
        </div>
      </div>
    </header>
  );
}
