import { Badge } from "@/components/atoms";
import type { Status } from "@/lib/types";

interface TagItem {
  label?: string;
  color?: string; // hex
}

interface BadgeBlockProps {
  // Backward compat
  label?: string;
  status?: Status;
  // New format
  tags?: TagItem[];
}

function hexLuminance(hex: string) {
  try {
    const h = hex.replace("#", "");
    const bigint = parseInt(
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h,
      16,
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    // relative luminance approximation
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  } catch {
    return 1;
  }
}

/**
 * Renders single or multiple status badges from configurable block props.
 * Used in X case: showing categorical tags in dynamic admin-built pages.
 */
export function BadgeBlock({ label, status, tags }: BadgeBlockProps) {
  // If tags provided (new format), render multiple colored chips
  if (Array.isArray(tags) && tags.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t, i) => {
          const text = t.label ?? "Etiqueta";
          const color = t.color ?? "#3b82f6";
          const lum = hexLuminance(color);
          const textClass = lum > 0.6 ? "text-black" : "text-white";
          return (
            <span
              key={i}
              style={{ backgroundColor: color }}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-(length:--font-size-xs) font-medium ${textClass}`}
            >
              {text}
            </span>
          );
        })}
      </div>
    );
  }

  // Backward compat: single label/status
  return (
    <div>
      <Badge status={status ?? "default"}>{label ?? "Etiqueta"}</Badge>
    </div>
  );
}
