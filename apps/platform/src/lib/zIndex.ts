/**
 * Single source of truth for stacking order.
 * Values stay as full Tailwind literals so the scanner always generates them.
 */
export const Z_INDEX = {
  help: "z-10",
  navbar: "z-20",
  sidebar: "z-30",
  overlay: "z-30",
  drawer: "z-40",
  popover: "z-50",
  select: "z-50",
  dialog: "z-50",
  toast: "z-50",
  banner: "z-[60]",
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
