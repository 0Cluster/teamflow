import type { Socket } from "socket.io";

export interface SocketUser {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

/* ---------- Shared DTOs ---------- */

export interface SocketTask {
  id: string;
  projectId: string;
  number: number;
  identifier: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId: string | null;
  labelIds: string[];
  createdBy: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocketComment {
  _id: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocketActivity {
  _id: string;
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SocketProject {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocketNotification {  _id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  actorId?: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDeletedPayload {
  taskId: string;
}

export interface ProjectDeletedPayload {
  projectId: string;
}

export interface CommentDeletedPayload {
  commentId: string;
}

/* ---------- Socket Events ---------- */

export interface ServerToClientEvents {
  "task:created": (task: SocketTask) => void;
  "task:updated": (task: SocketTask) => void;
  "task:deleted": (payload: TaskDeletedPayload) => void;

  "project:created": (project: SocketProject) => void;
  "project:updated": (project: SocketProject) => void;
  "project:deleted": (payload: ProjectDeletedPayload) => void;

  "comment:created": (comment: SocketComment) => void;
  "comment:updated": (comment: SocketComment) => void;
  "comment:deleted": (payload: CommentDeletedPayload) => void;

  "notification:new": (
    notification: SocketNotification,
  ) => void;

  "activity:new": (
    activity: SocketActivity,
  ) => void;

  "member:added": (membership: unknown) => void;
  "member:updated": (membership: unknown) => void;
  "member:removed": (membership: unknown) => void;
}

export interface ClientToServerEvents {
  "organization:join": (
    organizationId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;

  "organization:leave": (
    organizationId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;

  "project:join": (
    projectId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;

  "project:leave": (
    projectId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;

  "task:join": (
    taskId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;

  "task:leave": (
    taskId: string,
    callback?: (
      response: {
        success: boolean;
        message?: string;
      },
    ) => void,
  ) => void;
}
