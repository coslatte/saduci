import type { Size, Variant } from "@/lib/types";

export type IconButtonVariant = Exclude<Variant, "circle">;

export const spinnerSizeMap: Record<Size, "xs" | "sm" | "md" | "lg"> = {
  xs: "xs",
  sm: "sm",
  md: "sm",
  lg: "md",
  xl: "md",
};
