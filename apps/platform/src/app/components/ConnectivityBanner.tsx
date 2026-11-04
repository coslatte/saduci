"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { probeServer } from "@/lib/serverAvailability";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/zIndex";

const BACKEND_POLL_MS = 2_000;

/**
 * Global connectivity banner. Rendered outside the authenticated shell so
 * public routes (login/register) also warn when the browser loses
 * connectivity or when the backend stops responding.
 *
 * While the backend is down it polls every 2s (so recovery hides the banner
 * almost immediately), shows the elapsed disconnected time in seconds, and
 * offers a manual retry in case a probe ever looks stuck.
 */
export function ConnectivityBanner() {
  const online = useOnlineStatus();
  const [backendReachable, setBackendReachable] = useState(true);
  const [downSince, setDownSince] = useState<number | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [checking, setChecking] = useState(false);
  const probingRef = useRef(false);

  const probe = useCallback(async () => {
    if (probingRef.current) return;
    probingRef.current = true;
    setChecking(true);
    try {
      const reachable = await probeServer();
      setBackendReachable(reachable);
      setDownSince((previous) => {
        if (reachable) return null;
        return previous ?? Date.now();
      });
    } finally {
      probingRef.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!online) {
      setDownSince(null);
      return;
    }
    void probe();
    const timer = window.setInterval(() => void probe(), BACKEND_POLL_MS);
    return () => window.clearInterval(timer);
  }, [online, probe]);

  useEffect(() => {
    if (downSince === null) {
      setElapsedSecs(0);
      return;
    }
    const update = () =>
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - downSince) / 1000)));
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [downSince]);

  if (!online) {
    return (
      <div
        role="alert"
        className={cn(
          "fixed top-0 inset-x-0 flex items-center justify-center gap-2 bg-red-600 px-4 py-1.5 text-sm font-medium text-white shadow-lg",
          Z_INDEX.banner,
        )}
      >
        <span className="inline-block size-1.5 rounded-full bg-white animate-pulse" />
        Sin conexión a internet. Verifique su red e inténtelo de nuevo.
      </div>
    );
  }

  if (!backendReachable) {
    return (
      <div
        role="alert"
        className={cn(
          "fixed top-0 inset-x-0 flex items-center justify-center gap-2 bg-mist-800 px-4 py-1.5 text-sm font-medium text-white shadow-lg",
          Z_INDEX.banner,
        )}
      >
        <span className="inline-block size-1.5 rounded-full bg-white animate-pulse" />
        <span>
          No se pudo conectar con el servidor. Reintentando la conexión… (
          {elapsedSecs} s)
        </span>
        <button
          type="button"
          onClick={() => void probe()}
          disabled={checking}
          className="ml-1 inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-white/30 disabled:opacity-60"
        >
          <FiRefreshCw
            className={checking ? "size-3 animate-spin" : "size-3"}
          />
          Reintentar ahora
        </button>
      </div>
    );
  }

  return null;
}

export default ConnectivityBanner;
