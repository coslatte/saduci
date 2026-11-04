"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/zIndex";

const SAFETY_TIMEOUT_MS = 10_000;

/**
 * RouteProgressBar
 *
 * Thin indeterminate bar shown at the top of the viewport while a client-side
 * navigation is in flight. The App Router does not expose a global pending
 * state, so this listens for same-origin link clicks and clears when the
 * pathname commits. A safety timeout guarantees the bar never gets stuck if a
 * navigation is cancelled.
 *
 * Used in X case: immediate feedback after clicking a navigation link, before
 * the destination's `loading.tsx` skeleton takes over.
 */
export function RouteProgressBar() {
  const pathname = usePathname();

  // Remounting on pathname change resets the inner state without writing to
  // state from an effect, which the React Compiler lint rules reject.
  return <RouteProgressBarInner key={pathname} />;
}

function RouteProgressBarInner() {
  const [active, setActive] = useState(false);
  const safetyRef = useRef<number | null>(null);

  useEffect(() => {
    function clearSafety() {
      if (safetyRef.current !== null) {
        window.clearTimeout(safetyRef.current);
        safetyRef.current = null;
      }
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      setActive(true);
      clearSafety();
      safetyRef.current = window.setTimeout(
        () => setActive(false),
        SAFETY_TIMEOUT_MS,
      );
    }

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      clearSafety();
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Cargando la página"
      className={cn(
        "fixed inset-x-0 top-0 h-0.5 overflow-hidden bg-primary-100",
        Z_INDEX.banner,
      )}
    >
      <div className="h-full w-1/3 animate-[routeProgress_1.1s_ease-in-out_infinite] bg-primary-600 motion-reduce:animate-none" />
    </div>
  );
}

export default RouteProgressBar;
