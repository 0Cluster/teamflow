import type { Server } from "socket.io";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket.types.js";

type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents
>;

let io: SocketServer | null = null;

export function setSocketServer(
  socketServer: SocketServer,
): void {
  io = socketServer;
}

export function getSocketServer(): SocketServer | null {
  return io;
}

function emitToRooms(
  rooms: string[],
  event: keyof ServerToClientEvents,
  payload: unknown,
): void {
  const socketServer = getSocketServer();

  if (!socketServer) {
    return;
  }

  let emitter = socketServer.to(rooms[0]!);

  for (const room of rooms.slice(1)) {
    emitter = emitter.to(room);
  }

  emitter.emit(event, payload);
}

export function emitTaskCreated(
  organizationId: string,
  projectId: string,
  task: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "task:created",
    task,
  );
}

export function emitTaskUpdated(
  organizationId: string,
  projectId: string,
  task: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "task:updated",
    task,
  );
}

export function emitTaskDeleted(
  organizationId: string,
  projectId: string,
  task: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "task:deleted",
    task,
  );
}

export function emitCommentCreated(
  organizationId: string,
  projectId: string,
  comment: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "comment:created",
    comment,
  );
}

export function emitCommentUpdated(
  organizationId: string,
  projectId: string,
  comment: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "comment:updated",
    comment,
  );
}

export function emitCommentDeleted(
  organizationId: string,
  projectId: string,
  comment: unknown,
): void {
  emitToRooms(
    [
      `organization:${organizationId}`,
      `project:${projectId}`,
    ],
    "comment:deleted",
    comment,
  );
}

export function emitActivity(
  organizationId: string,
  activity: unknown,
): void {
  emitToRooms(
    [`organization:${organizationId}`],
    "activity:new",
    activity,
  );
}

export function emitNotification(
  userId: string,
  notification: unknown,
): void {
  emitToRooms(
    [`user:${userId}`],
    "notification:new",
    notification,
  );
}
