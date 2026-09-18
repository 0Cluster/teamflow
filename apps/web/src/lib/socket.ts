import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket.js";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ??
  "http://localhost:5000";

export const socket: Socket<
  ServerToClientEvents,
  ClientToServerEvents
> = io(socketUrl, {
  autoConnect: false,
});
