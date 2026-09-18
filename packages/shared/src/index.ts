/**
 * Shared transport-level contracts between `@teamflow/api` and `@teamflow/web`.
 *
 * Scope decision: this package owns envelope/pagination shapes only.
 * Domain unions (task statuses, roles, notification types) stay colocated
 * with their runtime validators — backend unions are derived from zod enums
 * (single source of truth per API boundary) and the frontend mirrors them
 * for display. Single-sourcing those would require a runtime dependency
 * shared by both bundles, which is not worth the coupling here.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
