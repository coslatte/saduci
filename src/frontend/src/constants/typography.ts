export const TYPOGRAPHY_SIZE_CLASSES = {
  xs: "text-(length:--font-size-xs)",
  sm: "text-(length:--font-size-sm)",
  base: "text-(length:--font-size-base)",
  lg: "text-(length:--font-size-lg)",
  xl: "text-(length:--font-size-xl)",
  "2xl": "text-(length:--font-size-2xl)",
  "3xl": "text-(length:--font-size-3xl)",
  "4xl": "text-(length:--font-size-4xl)",
} as const;

export const TYPOGRAPHY_WEIGHT_CLASSES = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

export const TYPOGRAPHY_TRACKING_CLASSES = {
  normal: "tracking-normal",
  tight: "tracking-tight",
  wide: "tracking-wide",
  widest: "tracking-widest",
} as const;

export const TYPOGRAPHY_FAMILY_CLASSES = {
  primary: "font-primary",
  secondary: "font-secondary",
} as const;

export const TYPOGRAPHY_TONE_CLASSES = {
  default: "text-zinc-900",
  muted: "text-slate-500",
  subtle: "text-slate-400",
} as const;

export type TypographySize = keyof typeof TYPOGRAPHY_SIZE_CLASSES;
export type TypographyWeight = keyof typeof TYPOGRAPHY_WEIGHT_CLASSES;
export type TypographyTracking = keyof typeof TYPOGRAPHY_TRACKING_CLASSES;
export type TypographyFamily = keyof typeof TYPOGRAPHY_FAMILY_CLASSES;
export type TypographyTone = keyof typeof TYPOGRAPHY_TONE_CLASSES;
