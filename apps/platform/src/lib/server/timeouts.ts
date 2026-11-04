/**
 * Per-feature upstream timeouts for BFF → API Gateway calls.
 * Simulation / prediction inference are slow; auth must fail fast.
 */
export const UPSTREAM_TIMEOUTS_MS = {
  auth: 10_000,
  users: 15_000,
  prediction: 30_000,
  predictionExplain: 30_000,
  simulation: 30_000,
  statistics: 30_000,
  records: 20_000,
  dashboard: 10_000,
  default: 15_000,
} as const;

export type UpstreamTimeoutKey = keyof typeof UPSTREAM_TIMEOUTS_MS;
