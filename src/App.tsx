import { SafeThemeProvider } from "@/components/common/SafeThemeProvider";
import { CompareSection } from "@/components/compare/CompareSection";
import { CropperSection } from "@/components/cropper/CropperSection";
import { PdfCropAdjustModal } from "@/components/cropper/PdfCropAdjustModal";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { useCompareWorkflow } from "@/hooks/useCompareWorkflow";
import { useCropConfig } from "@/hooks/useCropConfig";
import type { AppSection, CropSetGroup, UploadedPdfFile } from "@/types";
import { ToastProvider } from "@elsesourav/react-ui";
import { useCallback, useMemo, useState } from "react";

function AppShell() {
  const { config, updateConfig } = useCropConfig();
  const [activeSection, setActiveSection] = useState<AppSection>("cropper");

  const [cropperSets, setCropperSets] = useState<CropSetGroup[]>([
    { id: "crop-set-1", label: "PDF Set 1", files: [] },
  ]);

  const compareWorkflow = useCompareWorkflow(config);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropPreviewFiles, setCropPreviewFiles] = useState<UploadedPdfFile[]>([]);

  const handleOpenCropAdjust = useCallback((previewFiles: UploadedPdfFile[]) => {
    setCropPreviewFiles(previewFiles);
    setCropModalOpen(true);
  }, []);

  const cropperFileCount = useMemo(
    () => cropperSets.reduce((sum, s) => sum + s.files.length, 0),
    [cropperSets],
  );

  const compareFileCount = useMemo(
    () => compareWorkflow.sets.reduce((sum, s) => sum + s.files.length, 0),
    [compareWorkflow.sets],
  );

  return (
    <div className="app-canvas-bg flex min-h-dvh flex-col text-foreground">
      <AppHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        cropperFileCount={cropperFileCount}
        compareFileCount={compareFileCount}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <section
          aria-hidden={activeSection !== "cropper"}
          className={activeSection === "cropper" ? "block" : "hidden"}
        >
          <CropperSection
            config={config}
            onUpdateConfig={updateConfig}
            onOpenCropAdjust={handleOpenCropAdjust}
            sets={cropperSets}
            onSetsChange={setCropperSets}
          />
        </section>

        <section
          aria-hidden={activeSection !== "compare"}
          className={activeSection === "compare" ? "block" : "hidden"}
        >
          <CompareSection
            workflow={compareWorkflow}
            config={config}
            onUpdateConfig={updateConfig}
            onOpenCropAdjust={handleOpenCropAdjust}
          />
        </section>
      </main>

      <AppFooter />

      <PdfCropAdjustModal
        open={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        documentType={config.documentType}
        currentMargins={config.margins}
        onSave={(margins) => updateConfig({ margins })}
        uploadedFiles={cropPreviewFiles}
      />
    </div>
  );
}

export default function App() {
  return (
    <SafeThemeProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </SafeThemeProvider>
  );
}
