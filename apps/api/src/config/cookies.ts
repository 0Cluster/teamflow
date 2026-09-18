import type { CookieOptions } from "express";

import { env } from "./env.js";
import { durationToMilliseconds } from "../utils/duration.js";

const refreshTokenMaxAge = durationToMilliseconds(
  env.JWT_REFRESH_EXPIRES_IN,
);

const secureCookies = env.NODE_ENV === "production";

if (env.COOKIE_SAMESITE === "none" && !secureCookies) {
  throw new Error(
    "COOKIE_SAMESITE=none requires secure cookies, which are only enabled when NODE_ENV=production. Browsers reject insecure SameSite=None cookies.",
  );
}

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: env.COOKIE_SAMESITE,
  path: "/api/v1/auth",
  maxAge: refreshTokenMaxAge,
};
