import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

export function generateAccessToken(
  payload: AccessTokenPayload,
): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn:
      env.JWT_ACCESS_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`,
  });
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  return jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
  ) as AccessTokenPayload;
}

export function generateRefreshToken(
  payload: RefreshTokenPayload,
): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn:
      env.JWT_REFRESH_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d" | "w" | "y"}`,
  });
}

export function verifyRefreshToken(
  token: string,
): RefreshTokenPayload {
  return jwt.verify(
    token,
    env.JWT_REFRESH_SECRET,
  ) as RefreshTokenPayload;
}
