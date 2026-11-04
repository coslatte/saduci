"use client";

import { useEffect, useState } from "react";
import {
  GENERIC_LOADING_PHASES,
  resolveLoadingMessage,
  type LoadingPhase,
} from "@/constants/loading";

export interface UseProgressiveStatusOptions {
  /**
   * Fixed start timestamp in `Date.now()` terms. When omitted, the moment the
   * hook becomes active is used. Pass the same timestamp the operation uses so
   * the copy and the visible clock never disagree.
   */
  startedAt?: number | null;
  /** Copy phases; defaults to the generic in-app progression. */
  phases?: readonly LoadingPhase[];
}

export interface ProgressiveStatus {
  /** Time-aware message for the current phase. */
  message: string;
  /** Whole seconds elapsed since the operation started. */
  elapsedSeconds: number;
}

/**
 * Reports how long an operation has been running and returns copy that becomes
 * more informative as time passes, instead of a static "Cargando…".
 *
 * The elapsed value updates once per second through an interval, so nothing is
 * written to state during the effect body (which the React Compiler lint rules
 * reject). While inactive the hook reports zero without touching state.
 *
 * @example
 * const { message, elapsedSeconds } = useProgressiveStatus(loading);
 * return <Spinner label={message} />;
 */
export function useProgressiveStatus(
  active: boolean,
  options: UseProgressiveStatusOptions = {},
): ProgressiveStatus {
  const { startedAt = null, phases = GENERIC_LOADING_PHASES } = options;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;

    const start = startedAt ?? Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  const effectiveSeconds = active ? elapsedSeconds : 0;

  return {
    message: resolveLoadingMessage(effectiveSeconds, phases),
    elapsedSeconds: effectiveSeconds,
  };
}
