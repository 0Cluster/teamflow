import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { env } from "../config/env.js";
import { setSocketServer } from "./socket.events.js";
import { authenticateSocket } from "./socket.auth.js";
import {
  joinOrganizationRoom,
  joinProjectRoom,
  leaveOrganizationRoom,
  leaveProjectRoom,
  joinTaskRoom,
  leaveTaskRoom,
} from "./socket.rooms.js";
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket.types.js";

export function initializeSocketServer(
  httpServer: HttpServer,
): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true,
      },
    },
  );
setSocketServer(io);

  io.use(authenticateSocket);

io.on("connection", (socket) => {
  const authenticatedSocket = socket as AuthenticatedSocket;

  console.log(`Socket connected: ${socket.id}`);

  void authenticatedSocket.join(`user:${authenticatedSocket.user.id}`);

    socket.on("organization:join", async (organizationId, callback) => {
      try {
        const joined = await joinOrganizationRoom(socket, organizationId);

        callback?.(
          joined
            ? { success: true }
            : {
                success: false,
                message: "You are not a member of this organization",
              },
        );
      } catch {
        callback?.({
          success: false,
          message: "Failed to join organization",
        });
      }
    });

    socket.on("organization:leave", async (organizationId, callback) => {
      try {
        await leaveOrganizationRoom(socket, organizationId);

        callback?.({
          success: true,
        });
      } catch {
        callback?.({
          success: false,
          message: "Failed to leave organization",
        });
      }
    });

    socket.on("project:join", async (projectId, callback) => {
      try {
        const joined = await joinProjectRoom(socket, projectId);

        callback?.(
          joined
            ? { success: true }
            : {
                success: false,
                message: "Project not found or access denied",
              },
        );
      } catch {
        callback?.({
          success: false,
          message: "Failed to join project",
        });
      }
    });

    socket.on("project:leave", async (projectId, callback) => {
      try {
        await leaveProjectRoom(socket, projectId);

        callback?.({
          success: true,
        });
      } catch {
        callback?.({
          success: false,
          message: "Failed to leave project",
        });
      }
    });

    socket.on("task:join", async (taskId, callback) => {
      try {
        const joined = await joinTaskRoom(socket, taskId);

        callback?.(
          joined
            ? { success: true }
            : {
                success: false,
                message: "Task not found or access denied",
              },
        );
      } catch {
        callback?.({
          success: false,
          message: "Failed to join task",
        });
      }
    });

    socket.on("task:leave", async (taskId, callback) => {
      try {
        await leaveTaskRoom(socket, taskId);

        callback?.({
          success: true,
        });
      } catch {
        callback?.({
          success: false,
          message: "Failed to leave task",
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}
