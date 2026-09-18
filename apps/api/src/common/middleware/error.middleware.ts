import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

function isMongooseCastError(error: unknown): error is { path?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "CastError"
  );
}

function isMongooseValidationError(error: unknown): error is {
  message?: unknown;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "ValidationError"
  );
}

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  /*
   * Malformed ObjectIds (e.g. /organizations/abc) surface as
   * Mongoose CastErrors. Map them to 400 instead of leaking a
   * 500 — the field name is safe to echo, values are not.
   */
  if (isMongooseCastError(error)) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_ID_FORMAT",
        message:
          typeof error.path === "string"
            ? `Invalid ${error.path} format`
            : "Invalid ID format",
      },
    });

    return;
  }

  if (isMongooseValidationError(error)) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message:
          typeof error.message === "string"
            ? error.message
            : "Invalid request data",
      },
    });

    return;
  }

  console.error("Unhandled error:", error);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
};
