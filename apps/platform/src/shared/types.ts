/** Standard result envelope returned by every Server Action used with forms. */
export type FormActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  errors?: Partial<Record<keyof T & string, string | string[]>>;
  data?: T;
} | null;
