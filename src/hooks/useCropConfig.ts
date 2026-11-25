import type { CropConfiguration } from "@/types";
import { loadCropConfiguration, saveCropConfiguration } from "@/utils/storage";
import { useCallback, useState } from "react";

export function useCropConfig() {
  const [config, setConfig] = useState<CropConfiguration>(() =>
    loadCropConfiguration(),
  );

  const updateConfig = useCallback((partial: Partial<CropConfiguration>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveCropConfiguration(next);
      return next;
    });
  }, []);

  return { config, updateConfig };
}
