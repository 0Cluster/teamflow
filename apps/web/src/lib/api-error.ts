/*
 * Extracts a human-readable message from an API failure.
 * Backend errors use `{ error: { message } }`; anything else
 * falls back so toasts never render "[object Object]".
 */
export function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response = (error as { response?: unknown }).response;

    if (response !== null && typeof response === "object" && "data" in response) {
      const data = (response as { data?: unknown }).data;

      if (data !== null && typeof data === "object" && "error" in data) {
        const apiError = (data as { error?: unknown }).error;

        if (
          apiError !== null &&
          typeof apiError === "object" &&
          "message" in apiError &&
          typeof (apiError as { message?: unknown }).message === "string"
        ) {
          return (apiError as { message: string }).message;
        }
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
