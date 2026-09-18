import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import { refreshTokenCookieOptions } from "../../config/cookies.js";
import {
  revokeSession,
} from "../sessions/session.repository.js";
import { verifyRefreshToken } from "../../utils/jwt.js";

export async function logout(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (
    typeof refreshToken === "string" &&
    refreshToken.length > 0
  ) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      await revokeSession(payload.sessionId);
    } catch {
      // Token is already invalid/expired.
      // We still clear the cookie.
    }
  }

  res.clearCookie(
    "refreshToken",
    refreshTokenCookieOptions,
  );

  res.status(200).json({
    success: true,
    data: {
      message: "Logged out successfully",
    },
  });
}
