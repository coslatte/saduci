/** Envelope for simple (non-paginated) backend responses. */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  lastPage: boolean;
  statistics?: Record<string, number | string | boolean | undefined>;
}

/** Paginated list envelope (DDAlmacenes-style, adapted to saduci-core). */
export interface ApiPaginationResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * FastAPI / saduci-core often returns bare arrays or keyed lists instead of
 * an envelope. This helper normalizes those shapes for feature API layers.
 */
export function unwrapList<T>(payload: unknown, keys: string[] = []): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  for (const key of ["items", "data", "results", "records", ...keys]) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}
