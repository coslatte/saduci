"use client";

import { useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiCopy,
  FiRefreshCw,
} from "react-icons/fi";
import { Button } from "@/components/atoms/Buttons";
import { Text } from "@/components/atoms/Text";
import { cn } from "@/lib/utils";

type ErrorTone = "danger" | "warning" | "info";

interface ErrorStateProps {
  title: string;
  description?: string;
  /** Renders a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Support reference (e.g. Next.js `digest`) shown under the message. */
  reference?: string;
  /** Technical detail kept behind a disclosure and copyable. */
  details?: string;
  /** Extra actions rendered next to the retry button. */
  actions?: React.ReactNode;
  tone?: ErrorTone;
  className?: string;
}

const TONE_CLASS: Record<
  ErrorTone,
  { container: string; icon: string; title: string; description: string }
> = {
  danger: {
    container: "border-red-200 bg-red-50",
    icon: "text-red-500",
    title: "text-red-900",
    description: "text-red-800",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    icon: "text-amber-500",
    title: "text-amber-900",
    description: "text-amber-800",
  },
  info: {
    container: "border-blue-200 bg-blue-50",
    icon: "text-blue-500",
    title: "text-blue-900",
    description: "text-blue-800",
  },
};

/**
 * ErrorState
 *
 * Standard error surface: it explains what failed and always offers a way out
 * (retry, custom actions, or a copyable reference). Technical details stay
 * collapsed so a clinician is not shown a stack trace by default, but support
 * can still copy it.
 *
 * Used in X case: route error boundaries and inline async failures.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Reintentar",
  reference,
  details,
  actions,
  tone = "danger",
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const toneClass = TONE_CLASS[tone];
  const copyValue = details ?? reference;

  async function handleCopy() {
    if (!copyValue || typeof navigator === "undefined" || !navigator.clipboard)
      return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Clipboard access can be denied; the details remain selectable.
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5",
        toneClass.container,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <FiAlertTriangle
          className={cn("mt-0.5 size-5 shrink-0", toneClass.icon)}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <Text
            as="h2"
            size="base"
            weight="semibold"
            className={toneClass.title}
          >
            {title}
          </Text>
          {description && (
            <Text as="p" size="sm" className={toneClass.description}>
              {description}
            </Text>
          )}
          {reference && (
            <Text as="p" size="xs" mono className="text-slate-500">
              Referencia: {reference}
            </Text>
          )}
        </div>
      </div>

      {(onRetry || actions || details) && (
        <div className="flex flex-wrap items-center gap-2">
          {onRetry && (
            <Button variant="primary" size="sm" onClick={onRetry}>
              <FiRefreshCw className="mr-1.5 size-4" />
              {retryLabel}
            </Button>
          )}
          {actions}
          {details && (
            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              aria-expanded={showDetails}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-(length:--font-size-sm) font-medium text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-800"
            >
              <FiChevronDown
                className={cn(
                  "size-4 transition-transform",
                  showDetails && "rotate-180",
                )}
              />
              {showDetails ? "Ocultar detalles" : "Ver detalles"}
            </button>
          )}
          {copyValue && (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-(length:--font-size-sm) font-medium text-slate-600 transition-colors hover:bg-white/60 hover:text-slate-800"
            >
              {copied ? (
                <FiCheck className="size-4" />
              ) : (
                <FiCopy className="size-4" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          )}
        </div>
      )}

      {showDetails && details && (
        <pre className="w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-900/90 p-3 text-(length:--font-size-xs) text-slate-100">
          {details}
        </pre>
      )}
    </div>
  );
}
