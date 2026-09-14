import { Platform } from "react-native";

export const PALETTE = {
  // Primary Stage
  duskViolet: "#8584bd",

  // Interactive Accents
  hiVisYellow: "#f4ed36",
  butteryYellow: "#f9cc73",

  // Surfaces & Nested Blocks
  lilacShadow: "#61609a",
  boneWhite: "#f9f5f2",

  // Confetti & Accent Surfaces
  bubblegumPink: "#f8c1ba",
  matchaCream: "#b5c995",
  magentaPunch: "#ac4f98",
  firecrackerRed: "#c94245",

  // High-Contrast Type & Borders
  inkBlack: "#1a1a1a",
  pureBlack: "#000000",
  pureWhite: "#ffffff",

  // Dark variant surfaces for dark mode support
  darkStage: "#121124",
  darkCard: "#1f1d38",
  darkNested: "#2c294d",
  darkBorder: "#3a3763",
} as const;

export const SURFACES = {
  stage: PALETTE.duskViolet,
  cardLight: PALETTE.boneWhite,
  cardNested: PALETTE.lilacShadow,
  accentSurface: PALETTE.hiVisYellow,
  alert: PALETTE.firecrackerRed,
  success: PALETTE.matchaCream,
  warning: PALETTE.butteryYellow,
} as const;

export const FONTS = {
  display: Platform.select({
    ios: "System",
    android: "sans-serif-condensed",
    default: "sans-serif",
  }),
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
  body: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "sans-serif",
  }),
};

export const SPACING = {
  unit: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 60,
  "5xl": 80,
} as const;

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 12,
  xl: 16,
  "2xl": 20,
  full: 9999,
} as const;

export const BORDERS = {
  hairline: 1,
  default: 1.5,
  heavy: 2,
  hard: 3,
} as const;

export interface ThemeColors {
  stage: string;
  card: string;
  cardNested: string;
  border: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSecondary: string;
  success: string;
  successLight: string;
  alert: string;
  alertLight: string;
  warning: string;
  warningLight: string;
  interactiveBorder: string;
}

export const lightThemeColors: ThemeColors = {
  stage: PALETTE.duskViolet,
  card: PALETTE.boneWhite,
  cardNested: PALETTE.lilacShadow,
  border: PALETTE.inkBlack,
  divider: "rgba(26, 26, 26, 0.12)",
  textPrimary: PALETTE.inkBlack,
  textSecondary: "rgba(26, 26, 26, 0.8)",
  textMuted: "rgba(26, 26, 26, 0.6)",
  accent: PALETTE.hiVisYellow,
  accentText: PALETTE.pureBlack,
  accentSecondary: PALETTE.butteryYellow,
  success: PALETTE.matchaCream,
  successLight: "rgba(181, 201, 149, 0.25)",
  alert: PALETTE.firecrackerRed,
  alertLight: "rgba(201, 66, 69, 0.2)",
  warning: PALETTE.butteryYellow,
  warningLight: "rgba(249, 204, 115, 0.25)",
  interactiveBorder: PALETTE.inkBlack,
};

export const darkThemeColors: ThemeColors = {
  stage: PALETTE.darkStage,
  card: PALETTE.darkCard,
  cardNested: PALETTE.darkNested,
  border: PALETTE.darkBorder,
  divider: "rgba(249, 245, 242, 0.12)",
  textPrimary: PALETTE.boneWhite,
  textSecondary: "rgba(249, 245, 242, 0.85)",
  textMuted: "rgba(249, 245, 242, 0.6)",
  accent: PALETTE.hiVisYellow,
  accentText: PALETTE.pureBlack,
  accentSecondary: PALETTE.butteryYellow,
  success: PALETTE.matchaCream,
  successLight: "rgba(181, 201, 149, 0.2)",
  alert: PALETTE.firecrackerRed,
  alertLight: "rgba(201, 66, 69, 0.25)",
  warning: PALETTE.butteryYellow,
  warningLight: "rgba(249, 204, 115, 0.2)",
  interactiveBorder: PALETTE.boneWhite,
};
