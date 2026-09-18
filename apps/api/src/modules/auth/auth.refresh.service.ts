import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { hashToken } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt.js";
import {
  findSessionById,
  revokeSession,
  updateRefreshToken,
} from "../sessions/session.repository.js";
import { findUserById } from "../users/user.repository.js";

export async function refreshAccessToken(
  refreshToken: string,
) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Invalid or expired refresh token",
    );
  }

const session = await findSessionById(payload.sessionId);

if (!session) {
  throw new AppError(
    401,
    "INVALID_SESSION",
    "Invalid or revoked session",
  );
}

if (session.userId.toString() !== payload.sub) {
  await revokeSession(payload.sessionId);

  throw new AppError(
    401,
    "INVALID_SESSION",
    "Invalid session",
  );
}

if (session.expiresAt.getTime() <= Date.now()) {
  await revokeSession(payload.sessionId);

  throw new AppError(
    401,
    "SESSION_EXPIRED",
    "Session has expired",
  );
}

  const tokenHash = hashToken(refreshToken);

  if (tokenHash !== session.refreshTokenHash) {
    await revokeSession(payload.sessionId);

    throw new AppError(
      401,
      "REFRESH_TOKEN_REUSE",
      "Refresh token is no longer valid",
    );
  }

  const user = await findUserById(payload.sub);

  if (!user || !user.isActive) {
    await revokeSession(payload.sessionId);

    throw new AppError(
      401,
      "INVALID_USER",
      "User is no longer active",
    );
  }

  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    sub: user.id,
    sessionId: payload.sessionId,
  });

  await updateRefreshToken(
    payload.sessionId,
    hashToken(newRefreshToken),
  );

return {
  accessToken,
  refreshToken: newRefreshToken,
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
};
}
