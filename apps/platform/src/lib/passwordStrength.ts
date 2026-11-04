export interface PasswordStrength {
  /** 0 (empty or very weak) to 4 (very strong). */
  score: 0 | 1 | 2 | 3 | 4;
  /** Short human label for the score. */
  label: string;
}

const STRENGTH_LABELS = [
  "Muy débil",
  "Débil",
  "Aceptable",
  "Fuerte",
  "Muy fuerte",
] as const;

/**
 * Scores a password from 0 to 4 by length and character variety. It is a
 * hint for the user, not a policy: the backend still owns the real rules.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(4, score) as PasswordStrength["score"];
  return { score: clamped, label: STRENGTH_LABELS[clamped] };
}
