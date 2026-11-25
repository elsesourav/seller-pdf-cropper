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
import { useCallback, useEffect, useState, type ReactNode } from "react";

const PRESET_KEY = "es-theme-preset";
const COLORS_KEY = "es-theme-colors";
const DARK_KEY = "es-theme-dark";
const TACTILE_KEY = "es-tactile-shadows";

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
 * Provides @elsesourav/react-ui ThemeContext without ever modifying window.location.
 */
export function SafeThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePresetKey>(() => {
    if (typeof window === "undefined") return "midnight";
    const saved = window.localStorage.getItem(PRESET_KEY) as ThemePresetKey | null;
    if (saved && (saved in THEME_PRESETS || saved === "custom")) {
      return saved;
    }
    return "midnight";
  });

  const [colors, setColors] = useState<ThemeColors>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(COLORS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as ThemeColors;
        } catch {
          // Fallback to preset colors
        }
      }
    }
    return THEME_PRESETS.midnight.colors;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(DARK_KEY);
    return saved !== null ? saved === "true" : true;
  });

  const [tactileShadows, setTactileShadows] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(TACTILE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("theme")) {
        url.searchParams.delete("theme");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }
  }, []);

  useEffect(() => {
    applyThemeTokens(colors, isDark);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(
        "data-tactile-shadows",
        tactileShadows ? "true" : "false",
      );
    }
    try {
      window.localStorage.setItem(PRESET_KEY, preset);
      window.localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
      window.localStorage.setItem(DARK_KEY, String(isDark));
      window.localStorage.setItem(TACTILE_KEY, String(tactileShadows));
    } catch {
      // Ignore storage failures
    }
  }, [preset, colors, isDark, tactileShadows]);

  const setPreset = useCallback((nextPreset: ThemePresetKey) => {
    setPresetState(nextPreset);
    if (nextPreset !== "custom") {
      const cfg = THEME_PRESETS[nextPreset];
      setColors(cfg.colors);
      setIsDark(cfg.isDark);
    }
  }, []);

  const updateColor = useCallback(
    (key: keyof ThemeColors, value: string | number) => {
      setPresetState("custom");
      setColors((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleDark = useCallback(() => {
    setIsDark((prevDark) => {
      const nextDark = !prevDark;
      if (nextDark && preset === "minimal-light") {
        setPresetState("midnight");
        setColors(THEME_PRESETS.midnight.colors);
      } else if (!nextDark && preset === "midnight") {
        setPresetState("minimal-light");
        setColors(THEME_PRESETS["minimal-light"].colors);
      }
      return nextDark;
    });
  }, [preset]);

  const resetTheme = useCallback(() => {
    setPreset("midnight");
  }, [setPreset]);

  const toggleTactileShadows = useCallback(() => {
    setTactileShadows((prev) => !prev);
  }, []);

  const value: ThemeContextType = {
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
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
