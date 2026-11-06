import { PREUCI_DIAG } from "@/lib/simulation";

/**
 * Diagnosis code rendering.
 *
 * The pickers show the clinical title only: a clinician selects "Insuficiencia
 * cardiaca descompensada", not "12 — Insuficiencia cardiaca descompensada", and
 * an index in front of every option just adds noise to compare against.
 *
 * The numeric code still matters in two places and stays visible there only:
 * the stored record detail, where the exact code that fed the model has to be
 * auditable, and the request payload, which is built from the option `value`.
 */

/** Title shown inside a diagnosis picker. */
export function diagnosisOptionLabel(code: number): string | null {
  return PREUCI_DIAG[code] ?? null;
}

/** Diagnosis rendering for a record detail: clinical title without its internal code. */
export function diagnosisDetailLabel(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const title = PREUCI_DIAG[value];
  return title ?? String(value);
}
