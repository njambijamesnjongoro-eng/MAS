"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "original" | "dark-medical";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  lowDataMode: boolean;
  setLowDataMode: (enabled: boolean) => void;
  toggleLowDataMode: () => void;
};

const STORAGE_KEY = "hospital-ehr-theme";
const LOW_DATA_STORAGE_KEY = "hospital-ehr-low-data-mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "dark-medical" ? "dark" : "light";
}

function applyLowDataMode(enabled: boolean) {
  if (enabled) {
    document.documentElement.dataset.bandwidth = "low";
    document.body.dataset.bandwidth = "low";
    return;
  }

  delete document.documentElement.dataset.bandwidth;
  delete document.body.dataset.bandwidth;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window === "undefined") {
      return "original";
    }
    return window.localStorage.getItem(STORAGE_KEY) === "dark-medical" ? "dark-medical" : "original";
  });
  const [lowDataMode, setLowDataModeState] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(LOW_DATA_STORAGE_KEY) === "enabled";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyLowDataMode(lowDataMode);
  }, [lowDataMode]);

  function setTheme(nextTheme: AppTheme) {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  function setLowDataMode(enabled: boolean) {
    setLowDataModeState(enabled);
    window.localStorage.setItem(LOW_DATA_STORAGE_KEY, enabled ? "enabled" : "disabled");
    applyLowDataMode(enabled);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark-medical" ? "original" : "dark-medical"),
      lowDataMode,
      setLowDataMode,
      toggleLowDataMode: () => setLowDataMode(!lowDataMode),
    }),
    [lowDataMode, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
