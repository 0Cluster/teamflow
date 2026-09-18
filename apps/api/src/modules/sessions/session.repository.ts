import { Session } from "./session.model.js";

export async function createSession(data: {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}) {
  return Session.create({
    _id: data.id,
    userId: data.userId,
    refreshTokenHash: data.refreshTokenHash,
    expiresAt: data.expiresAt,
  });
}

export async function findSessionById(sessionId: string) {
  return Session.findOne({
    _id: sessionId,
    revokedAt: null,
  }).exec();
}

export async function revokeSession(sessionId: string): Promise<void> {
  await Session.updateOne(
    {
      _id: sessionId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    },
  ).exec();
}

export async function updateRefreshToken(
  sessionId: string,
  refreshTokenHash: string,
): Promise<void> {
  await Session.updateOne(
    {
      _id: sessionId,
      revokedAt: null,
    },
    {
      $set: {
        refreshTokenHash,
      },
    },
  ).exec();
}
