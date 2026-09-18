import type { CookieOptions } from "express";

import { env } from "./env.js";
import { durationToMilliseconds } from "../utils/duration.js";

const refreshTokenMaxAge = durationToMilliseconds(
  env.JWT_REFRESH_EXPIRES_IN,
);

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
  maxAge: refreshTokenMaxAge,
};
