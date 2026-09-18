import bcrypt from "bcryptjs";
import { Types } from "mongoose";

import { env } from "../../config/env.js";
import { durationToMilliseconds } from "../../utils/duration.js";
import { AppError } from "../../common/errors/app-error.js";
import { hashToken } from "../../utils/hash.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";
import { createSession } from "../sessions/session.repository.js";
import {
  createUser,
  findUserByEmail,
  findUserByEmailWithPassword,
} from "../users/user.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export async function registerUser(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await findUserByEmailWithPassword(input.email);

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
  });

  const sessionId = new Types.ObjectId().toString();

  const refreshToken = generateRefreshToken({
    sub: user.id,
    sessionId,
  });

  await createSession({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: new Date(
      Date.now() + durationToMilliseconds(env.JWT_REFRESH_EXPIRES_IN),
    ),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  };
}
