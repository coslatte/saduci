"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

interface NavBreadcrumbProps {
  brandName: string;
  currentPage: string;
  segments?: BreadcrumbSegment[];
  className?: string;
}

/**
 * Builds a breadcrumb trail from current route segments and brand label.
 * Used in X case: contextual page path display inside the top navbar.
 */
export function NavBreadcrumb({
  brandName,
  currentPage,
  segments,
  className,
}: NavBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-(length:--font-size-xs) text-slate-500 sm:gap-2 sm:text-(length:--font-size-sm)",
        className,
      )}
    >
      {brandName && (
        <Link
          href="/"
          className="max-w-28 truncate select-none transition-colors hover:text-slate-800 focus:outline-none focus-visible:underline sm:max-w-none"
          aria-label={`Ir al inicio — ${brandName}`}
        >
          {brandName}
        </Link>
      )}
      {segments?.map((seg) => (
        <span key={seg.href} className="hidden md:contents">
          <span aria-hidden="true" className="text-slate-300">
            /
          </span>
          <Link
            href={seg.href}
            className="truncate transition-colors hover:text-slate-800"
          >
            {seg.label}
          </Link>
        </span>
      ))}
      {(brandName || (segments && segments.length > 0)) && (
        <span aria-hidden="true" className="text-slate-300">
          /
        </span>
      )}
      <span
        className="max-w-36 truncate font-semibold text-primary-700 sm:max-w-52 md:max-w-none"
        aria-current="page"
        title={currentPage}
      >
        {currentPage}
      </span>
    </nav>
  );
}
