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
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

const THEME_MODE_KEY = "seller-theme-mode";
const TACTILE_KEY = "es-tactile-shadows";

export interface ThemeTransitionOrigin {
  clientX?: number;
  clientY?: number;
}

interface ViewTransitionHandle {
  skipTransition?: () => void;
  ready?: Promise<void>;
  finished?: Promise<void>;
}

interface ThemeModeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (
    mode: ThemeMode,
    origin?: ThemeTransitionOrigin | ReactMouseEvent | MouseEvent,
  ) => void;
  cycleThemeMode: (
    origin?: ThemeTransitionOrigin | ReactMouseEvent | MouseEvent,
  ) => void;
  resolvedDark: boolean;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  themeMode: "auto",
  setThemeMode: () => {},
  cycleThemeMode: () => {},
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
  root.classList.remove("dark", "light");
  root.classList.add(isDark ? "dark" : "light");
  root.setAttribute("data-theme", isDark ? "dark" : "light");

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

function getColorsForDarkState(dark: boolean): ThemeColors {
  return dark
    ? THEME_PRESETS.midnight.colors
    : THEME_PRESETS["minimal-light"].colors;
}

/**
 * Provides 3-state (auto / light / dark) theme support with elsesourav's circular
 * View Transitions reveal animation, without mutating window.location.
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

  const themeModeRef = useRef<ThemeMode>(themeMode);
  themeModeRef.current = themeMode;
  const activeTransitionRef = useRef<ViewTransitionHandle | null>(null);

  const runCircularTransition = useCallback(
    (
      applyMutation: () => void,
      origin?: ThemeTransitionOrigin | ReactMouseEvent | MouseEvent,
    ) => {
      const supportsViewTransitions =
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

      let originX =
        origin && typeof origin.clientX === "number" && origin.clientX > 0
          ? Math.round(origin.clientX)
          : null;
      let originY =
        origin && typeof origin.clientY === "number" && origin.clientY > 0
          ? Math.round(origin.clientY)
          : null;

      if (typeof window !== "undefined" && (originX === null || originY === null)) {
        const triggerEl = document.querySelector('[aria-label="Change theme"]');
        if (triggerEl) {
          const rect = triggerEl.getBoundingClientRect();
          originX = Math.round(rect.left + rect.width / 2);
          originY = Math.round(rect.top + rect.height / 2);
        } else {
          originX = Math.round(window.innerWidth * 0.85);
          originY = 28;
        }
      }

      const x = originX ?? 100;
      const y = originY ?? 28;
      const endRadius =
        typeof window !== "undefined"
          ? Math.ceil(
              Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y),
              ),
            ) + 32
          : 2500;

      if (!supportsViewTransitions) {
        applyMutation();
        return;
      }

      try {
        if (activeTransitionRef.current?.skipTransition) {
          try {
            activeTransitionRef.current.skipTransition();
          } catch {
            // Ignore in-flight skip errors
          }
        }

        const doc = document as Document & {
          startViewTransition?: (cb: () => void) => ViewTransitionHandle;
        };
        const transition = doc.startViewTransition?.(() => {
          flushSync(() => {
            applyMutation();
          });
        });

        if (!transition) {
          applyMutation();
          return;
        }

        activeTransitionRef.current = transition;

        transition.ready
          ?.then(() => {
            try {
              const anim = document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`,
                  ],
                },
                {
                  duration: 500,
                  easing: "ease-in-out",
                  pseudoElement: "::view-transition-new(root)",
                  fill: "forwards",
                },
              );
              anim.addEventListener("error", () => {});
            } catch {
              // Ignore animate fallback
            }
          })
          .catch(() => {});

        transition.finished
          ?.catch(() => {})
          .finally(() => {
            if (activeTransitionRef.current === transition) {
              activeTransitionRef.current = null;
            }
          });
      } catch {
        applyMutation();
      }
    },
    [],
  );

  // Strip ?theme= param on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("theme")) {
      url.searchParams.delete("theme");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  // Follow system preference with circular reveal when in auto mode
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      const nextDark = event.matches;
      if (themeModeRef.current === "auto") {
        const originX = Math.round(window.innerWidth / 2);
        runCircularTransition(
          () => {
            setSystemDark(nextDark);
            applyThemeTokens(getColorsForDarkState(nextDark), nextDark);
          },
          { clientX: originX, clientY: 0 },
        );
      } else {
        setSystemDark(nextDark);
      }
    };
    setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [runCircularTransition]);

  const isDark = themeMode === "auto" ? systemDark : themeMode === "dark";
  const preset: ThemePresetKey =
    customPreset || (isDark ? "midnight" : "minimal-light");
  const colors: ThemeColors = useMemo(() => {
    if (customColors) return customColors;
    return getColorsForDarkState(isDark);
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
      window.localStorage.setItem(TACTILE_KEY, String(tactileShadows));
    } catch {
      // Ignore storage errors
    }
  }, [themeMode, colors, isDark, tactileShadows]);

  const setThemeMode = useCallback(
    (
      mode: ThemeMode,
      origin?: ThemeTransitionOrigin | ReactMouseEvent | MouseEvent,
    ) => {
      if (mode === themeModeRef.current && !customPreset) return;
      themeModeRef.current = mode;
      const nextDark = mode === "auto" ? getSystemPrefersDark() : mode === "dark";
      const nextColors = getColorsForDarkState(nextDark);

      runCircularTransition(() => {
        setCustomPreset(null);
        setCustomColors(null);
        setThemeModeState(mode);
        applyThemeTokens(nextColors, nextDark);
      }, origin);
    },
    [customPreset, runCircularTransition],
  );

  const cycleThemeMode = useCallback(
    (origin?: ThemeTransitionOrigin | ReactMouseEvent | MouseEvent) => {
      const order: ThemeMode[] = ["auto", "light", "dark"];
      const idx = order.indexOf(themeModeRef.current);
      const nextMode = order[(idx + 1) % order.length];
      setThemeMode(nextMode, origin);
    },
    [setThemeMode],
  );

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
    cycleThemeMode();
  }, [cycleThemeMode]);

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
      value={{ themeMode, setThemeMode, cycleThemeMode, resolvedDark: isDark }}
    >
      <ThemeContext.Provider value={themeContextValue}>
        {children}
      </ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}
