import type { ExtendedError } from "socket.io";
import type { Socket } from "socket.io";

import { verifyAccessToken } from "../utils/jwt.js";
import type { AuthenticatedSocket } from "./socket.types.js";

export async function authenticateSocket(
  socket: Socket,
  next: (err?: ExtendedError) => void,
): Promise<void> {
  try {
    const authToken = socket.handshake.auth?.token;

    const authorizationHeader =
      socket.handshake.headers.authorization;

    const headerToken =
      typeof authorizationHeader === "string" &&
      authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice(7).trim()
        : undefined;

    const token =
      typeof authToken === "string"
        ? authToken.trim()
        : headerToken;

    if (!token) {
      throw new Error("Socket authentication required");
    }

    const payload = verifyAccessToken(token);

    const authenticatedSocket =
      socket as AuthenticatedSocket;

    authenticatedSocket.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
