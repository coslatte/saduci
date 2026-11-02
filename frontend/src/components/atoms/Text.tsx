import { cn } from "@/lib/utils";
import {
  TYPOGRAPHY_FAMILY_CLASSES,
  TYPOGRAPHY_SIZE_CLASSES,
  TYPOGRAPHY_TONE_CLASSES,
  TYPOGRAPHY_TRACKING_CLASSES,
  TYPOGRAPHY_WEIGHT_CLASSES,
  type TypographyFamily,
  type TypographySize,
  type TypographyTracking,
  type TypographyWeight,
} from "@/constants/typography";

type TextElement = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextElement;
  size?: TypographySize;
  weight?: TypographyWeight;
  muted?: boolean;
  family?: TypographyFamily;
  uppercase?: boolean;
  tracking?: TypographyTracking;
  mono?: boolean;
  separator?: boolean;
  children: React.ReactNode;
}

/**
 * Applies design-system typography variants to semantic text elements.
 * Used in X case: consistent text styling across atoms, molecules, and pages.
 */
export function Text({
  as: Tag = "p",
  size = "base",
  weight = "normal",
  muted = false,
  family = "primary",
  uppercase = false,
  tracking = "normal",
  mono = false,
  separator = false,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      className={cn(
        TYPOGRAPHY_SIZE_CLASSES[size],
        TYPOGRAPHY_WEIGHT_CLASSES[weight],
        TYPOGRAPHY_TRACKING_CLASSES[tracking],
        TYPOGRAPHY_FAMILY_CLASSES[family],
        muted ? TYPOGRAPHY_TONE_CLASSES.muted : TYPOGRAPHY_TONE_CLASSES.default,
        mono && "font-mono",
        uppercase && "uppercase",
        separator && "border-b border-slate-200 pb-3",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
