"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/zIndex";

type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  type: ToastType;
  /** Auto-dismiss delay in milliseconds. */
  duration: number;
  action?: ToastAction;
}

type ToastEvent =
  | { type: "add"; item: ToastItem }
  | { type: "remove"; id: number };

/** Oldest toasts are dropped beyond this many so the stack never grows wild. */
const MAX_VISIBLE = 4;

const emitter = {
  listeners: new Set<(event: ToastEvent) => void>(),
  emit(event: ToastEvent) {
    this.listeners.forEach((l) => l(event));
  },
};

let nextId = 1;

/**
 * Shows a transient notification. Long messages stay visible longer, and an
 * optional action lets the user act (for example, retry) without hunting for
 * the failed section.
 */
export function showToast({
  title,
  description,
  type = "info",
  duration,
  action,
}: {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}) {
  const id = nextId++;
  const textLength = (title + (description ?? "")).length;
  const effectiveDuration = duration ?? (textLength > 100 ? 10000 : 5000);
  emitter.emit({
    type: "add",
    item: { id, title, description, type, duration: effectiveDuration, action },
  });
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    function handler(event: ToastEvent) {
      if (event.type === "add") {
        setItems((prev) => [...prev, event.item].slice(-MAX_VISIBLE));
      }
      if (event.type === "remove") {
        setItems((prev) => prev.filter((t) => t.id !== event.id));
      }
    }
    emitter.listeners.add(handler);
    return () => {
      emitter.listeners.delete(handler);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 flex flex-col gap-2",
        Z_INDEX.toast,
      )}
      role="region"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(item.id), item.duration);
    return () => window.clearTimeout(timer);
  }, [paused, item.id, item.duration, onDismiss]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg max-w-sm",
        "animate-[slideIn_0.3s_ease-out]",
        item.type === "success" && "border-emerald-200",
        item.type === "error" && "border-red-200",
        item.type === "info" && "border-blue-200",
      )}
    >
      {item.type === "success" && (
        <FiCheckCircle className="mt-0.5 size-5 shrink-0 text-emerald-500" />
      )}
      {item.type === "error" && (
        <FiXCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
      )}
      {item.type === "info" && (
        <FiInfo className="mt-0.5 size-5 shrink-0 text-blue-500" />
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            item.type === "success" && "text-emerald-900",
            item.type === "error" && "text-red-900",
            item.type === "info" && "text-slate-900",
          )}
        >
          {item.title}
        </p>
        {item.description && (
          <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
        )}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="mt-1.5 text-(length:--font-size-sm) font-semibold text-primary-700 hover:underline"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 text-slate-400 hover:text-slate-600"
      >
        <FiX className="size-4" />
      </button>
    </div>
  );
}
