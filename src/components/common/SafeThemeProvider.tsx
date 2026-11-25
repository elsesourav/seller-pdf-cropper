import type { ThemeMode } from "@/types";
import {
  adjustHslLightness,
  getContrastTextColor,
  hexToHslString,
  THEME_PRESETS,
  ThemeContext,
  type ThemeColors,
  type ThemeContextType,
  type ThemePresetKey,
} from "@elsesourav/react-ui";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const THEME_MODE_KEY = "seller-theme-mode";
const COLORS_KEY = "es-theme-colors";
const TACTILE_KEY = "es-tactile-shadows";

interface ThemeModeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  resolvedDark: boolean;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: "auto",
  setThemeMode: () => {},
  resolvedDark: true,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeTokens(colors: ThemeColors, isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }

  const primary = hexToHslString(colors.primary);
  const background = hexToHslString(colors.background);
  const surface = hexToHslString(colors.surface);
  const foreground = hexToHslString(colors.foreground);
  const border = hexToHslString(colors.border);
  const accent = hexToHslString(colors.accent);
  const primaryFg = getContrastTextColor(colors.primary);

  const surfaceSubtle = isDark
    ? adjustHslLightness(surface, -3)
    : adjustHslLightness(surface, -4);
  const surfaceElevated = isDark
    ? adjustHslLightness(surface, 4)
    : "0 0% 100%";
  const surfaceSunken = isDark
    ? adjustHslLightness(background, -2)
    : adjustHslLightness(surface, -7);
  const borderSubtle = isDark
    ? adjustHslLightness(border, -5)
    : adjustHslLightness(border, 4);
  const borderStrong = isDark
    ? adjustHslLightness(border, 10)
    : adjustHslLightness(border, -10);

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", primaryFg);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--background", background);
  root.style.setProperty("--foreground", foreground);
  root.style.setProperty("--surface", surface);
  root.style.setProperty("--surface-subtle", surfaceSubtle);
  root.style.setProperty("--surface-elevated", surfaceElevated);
  root.style.setProperty("--surface-overlay", surfaceElevated);
  root.style.setProperty("--surface-sunken", surfaceSunken);
  root.style.setProperty("--card", surface);
  root.style.setProperty("--card-foreground", foreground);
  root.style.setProperty("--popover", surfaceElevated);
  root.style.setProperty("--popover-foreground", foreground);
  root.style.setProperty("--border", border);
  root.style.setProperty("--border-subtle", borderSubtle);
  root.style.setProperty("--border-strong", borderStrong);
  root.style.setProperty("--input", border);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--radius", `${colors.radius}px`);
  root.style.setProperty("--radius-sm", `${Math.max(4, colors.radius - 4)}px`);
  root.style.setProperty("--radius-md", `${Math.max(6, colors.radius - 2)}px`);
  root.style.setProperty("--radius-lg", `${colors.radius}px`);
  root.style.setProperty("--radius-xl", `${colors.radius + 4}px`);
  root.style.setProperty("--radius-2xl", `${colors.radius + 8}px`);
}

/**
 * Provides 3-state (auto / light / dark) theme support without modifying window.location.
 */
export function SafeThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "auto";
    const saved = window.localStorage.getItem(THEME_MODE_KEY);
    if (saved === "auto" || saved === "light" || saved === "dark") {
      return saved;
    }
    return "auto";
  });

  const [systemDark, setSystemDark] = useState<boolean>(getSystemPrefersDark);
  const [customColors, setCustomColors] = useState<ThemeColors | null>(null);
  const [customPreset, setCustomPreset] = useState<ThemePresetKey | null>(null);
  const [tactileShadows, setTactileShadows] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(TACTILE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Ensure ?theme= URL parameter is never retained
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("theme")) {
      url.searchParams.delete("theme");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const isDark = themeMode === "auto" ? systemDark : themeMode === "dark";
  const preset: ThemePresetKey =
    customPreset || (isDark ? "midnight" : "minimal-light");
  const colors: ThemeColors = useMemo(() => {
    if (customColors) return customColors;
    return isDark
      ? THEME_PRESETS.midnight.colors
      : THEME_PRESETS["minimal-light"].colors;
  }, [customColors, isDark]);

  useEffect(() => {
    applyThemeTokens(colors, isDark);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-tactile-shadows",
        tactileShadows ? "true" : "false",
      );
    }
    try {
      window.localStorage.setItem(THEME_MODE_KEY, themeMode);
      if (customColors) {
        window.localStorage.setItem(COLORS_KEY, JSON.stringify(customColors));
      } else {
        window.localStorage.removeItem(COLORS_KEY);
      }
      window.localStorage.setItem(TACTILE_KEY, String(tactileShadows));
    } catch {
      // Ignore storage errors
    }
  }, [themeMode, colors, isDark, customColors, tactileShadows]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setCustomPreset(null);
    setCustomColors(null);
    setThemeModeState(mode);
  }, []);

  const setPreset = useCallback((nextPreset: ThemePresetKey) => {
    setCustomPreset(nextPreset);
    if (nextPreset !== "custom") {
      const cfg = THEME_PRESETS[nextPreset];
      setCustomColors(cfg.colors);
      setThemeModeState(cfg.isDark ? "dark" : "light");
    }
  }, []);

  const updateColor = useCallback(
    (key: keyof ThemeColors, value: string | number) => {
      setCustomPreset("custom");
      setCustomColors((prev) => ({ ...(prev || colors), [key]: value }));
    },
    [colors],
  );

  const toggleDark = useCallback(() => {
    setCustomPreset(null);
    setCustomColors(null);
    setThemeModeState((prev) => {
      if (prev === "auto") return "dark";
      if (prev === "dark") return "light";
      return "auto";
    });
  }, []);

  const resetTheme = useCallback(() => {
    setThemeMode("auto");
  }, [setThemeMode]);

  const toggleTactileShadows = useCallback(() => {
    setTactileShadows((prev) => !prev);
  }, []);

  const themeContextValue: ThemeContextType = {
    preset,
    setPreset,
    colors,
    updateColor,
    isDark,
    toggleDark,
    resetTheme,
    tactileShadows,
    setTactileShadows,
    toggleTactileShadows,
  };

  return (
    <ThemeModeContext.Provider
      value={{ themeMode, setThemeMode, resolvedDark: isDark }}
    >
      <ThemeContext.Provider value={themeContextValue}>
        {children}
      </ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}
