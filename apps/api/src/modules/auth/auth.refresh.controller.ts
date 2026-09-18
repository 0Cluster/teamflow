import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import { refreshTokenCookieOptions } from "../../config/cookies.js";
import { refreshAccessToken } from "./auth.refresh.service.js";

export async function refresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken;

  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    throw new AppError(
      401,
      "REFRESH_TOKEN_REQUIRED",
      "Refresh token is required",
    );
  }

  const tokens = await refreshAccessToken(refreshToken);

  res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      user: tokens.user,
    },
  });
}
