"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RECORD_WORKSPACE_COPY } from "@/constants/recordHistory";
import { cn } from "@/lib/utils";
import { ExpandableDescription } from "@/components/molecules/ExpandableDescription";

interface RecordsPageHeaderProps {
  title: string;
  description?: string;
  expandableDescription?: { summary: string; detail: string };
  roleHint?: string;
  showNavigation?: boolean;
  embedded?: boolean;
  search?: {
    query: string;
    onChange: (query: string) => void;
    count: number;
    total: number;
    loading: boolean;
  };
}

export function RecordsPageHeader({
  title,
  description,
  expandableDescription,
  roleHint,
  showNavigation = true,
  embedded = false,
  search,
}: RecordsPageHeaderProps) {
  const pathname = usePathname();
  return (
    <header className="mb-6">
      <div className="border-b border-slate-300 pb-6">
        {embedded ? (
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
        )}
        {expandableDescription && (
          <ExpandableDescription summary={expandableDescription.summary}>
            {expandableDescription.detail}
          </ExpandableDescription>
        )}
        {description && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
        {roleHint && (
          <p className="mt-3 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600">
            {roleHint}
          </p>
        )}
      </div>
      {showNavigation && (
        <nav
          aria-label={RECORD_WORKSPACE_COPY.navigation}
          className="flex flex-wrap border-b border-slate-300"
        >
          {RECORD_WORKSPACE_COPY.tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary-600",
                  active
                    ? "border-primary-700 bg-primary-50 text-primary-800"
                    : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
      {search && (
        <div className="mt-6 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="grid max-w-xl gap-2 text-sm font-medium text-slate-700">
            {RECORD_WORKSPACE_COPY.search}
            <input
              type="search"
              value={search.query}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={RECORD_WORKSPACE_COPY.placeholder}
              className="min-w-0 w-full border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none placeholder:text-slate-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            />
          </label>
          <p
            role="status"
            aria-live="polite"
            className="py-2 text-sm tabular-nums text-slate-600"
          >
            {!search.loading && `${search.count} / ${search.total}`}
          </p>
        </div>
      )}
    </header>
  );
}
