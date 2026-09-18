import type { Request } from "express";
import { AppError } from "../errors/app-error.js";
export function getParam(
  req: Request,
  name: string,
): string {
  const value = req.params[name];

  if (typeof value !== "string") {
    throw new AppError(
      400,
      "INVALID_PARAMETER",
      `Invalid ${name}`,
    );
  }

  return value;
}
