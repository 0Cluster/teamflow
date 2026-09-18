import type { Request, Response } from "express";

import { refreshTokenCookieOptions } from "../../config/cookies.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { loginUser, registerUser } from "./auth.service.js";

export async function register(req: Request, res: Response): Promise<void> {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const user = await registerUser(result.data);

  res.status(201).json({
    success: true,
    data: {
      user,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const loginResult = await loginUser(result.data);

  res.cookie(
    "refreshToken",
    loginResult.refreshToken,
    refreshTokenCookieOptions,
  );

  res.status(200).json({
    success: true,
    data: {
      accessToken: loginResult.accessToken,
      user: loginResult.user,
    },
  });
}
