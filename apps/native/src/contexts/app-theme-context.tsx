import React, { createContext, useContext, useMemo } from "react";
import { darkThemeColors, type ThemeColors } from "@/lib/theme";

type ThemeName = "dark";

type AppThemeContextType = {
  theme: ThemeName;
  currentTheme: ThemeName;
  isLight: boolean;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useMemo<AppThemeContextType>(
    () => ({
      theme: "dark",
      currentTheme: "dark",
      isLight: false,
      isDark: true,
      colors: darkThemeColors,
      setTheme: () => {},
      toggleTheme: () => {},
    }),
    [],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
