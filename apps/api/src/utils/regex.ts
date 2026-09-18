/*
 * Escapes user input interpolated into a MongoDB $regex so the
 * search box behaves as literal text. Without this, patterns like
 * `(a+)+$` reach the regex engine and risk catastrophic
 * backtracking (ReDoS) on large collections.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
