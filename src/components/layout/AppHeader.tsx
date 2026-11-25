import type { AppSection } from "@/types";
import { Badge, Button, Tabs, useTheme } from "@elsesourav/react-ui";
import { Crop, GitCompareArrows, Moon, Sun } from "lucide-react";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  cropperFileCount: number;
  compareFileCount: number;
}

export function AppHeader({
  activeSection,
  onSectionChange,
  cropperFileCount,
  compareFileCount,
}: AppHeaderProps) {
  const { isDark, toggleDark } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-card/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src="./icon.png"
              alt="Seller PDF Cropper"
              className="h-9 w-9 shrink-0 rounded-xl border border-border/70 bg-surface-elevated object-cover shadow-lift"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                  Seller PDF Cropper
                </h1>
                <Badge
                  variant="success"
                  size="sm"
                  dot
                  className="hidden md:inline-flex"
                >
                  Client-Side
                </Badge>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                Multi-PDF crop, serial numbering &amp; N-set comparison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="h-9 w-9 rounded-xl"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
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

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleDark}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="h-9 w-9 rounded-xl"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
