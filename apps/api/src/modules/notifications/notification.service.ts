import {
  countNotificationsByUser,
  countUnreadNotificationsByUser,
  createNotification,
  findNotificationById,
  findNotificationsByUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.repository.js";

import { emitNotification } from "../../socket/socket.events.js";
import type { NotificationType } from "./notification.types.js";

interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotificationForUser(
  input: CreateNotificationInput,
) {
  const notification = await createNotification(input);

  emitNotification(
    input.userId,
    toNotificationDTO(notification),
  );

  return notification;
}

function idOf(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "object" &&
    "_id" in value
  ) {
    return String(
      (value as { _id: unknown })._id,
    );
  }

  return String(value);
}

interface PopulatedActor {
  _id: unknown;
  name: string;
  email: string;
}

interface PopulatedProject {
  _id: unknown;
  name: string;
  key: string;
}

interface PopulatedTask {
  _id: unknown;
  number: number;
  title: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function toNotificationDTO(
  notification: unknown,
) {
  const source: Record<string, unknown> =
    isRecord(notification) ? notification : {};

  const rawActor = source.actorId;
  const actorRecord =
    isRecord(rawActor) && "_id" in rawActor
      ? (rawActor as unknown as PopulatedActor)
      : undefined;
  const actor = actorRecord
    ? {
        id: String(actorRecord._id),
        name: actorRecord.name,
        email: actorRecord.email,
      }
    : undefined;

  const rawProject = source.projectId;
  const projectRecord =
    isRecord(rawProject) && "name" in rawProject
      ? (rawProject as unknown as PopulatedProject)
      : undefined;
  const project = projectRecord
    ? {
        id: String(projectRecord._id),
        name: projectRecord.name,
        key: projectRecord.key,
      }
    : undefined;

  const rawTask = source.taskId;
  const taskRecord =
    isRecord(rawTask) && "title" in rawTask
      ? (rawTask as unknown as PopulatedTask)
      : undefined;
  const task = taskRecord
    ? {
        id: String(taskRecord._id),
        number: taskRecord.number,
        title: taskRecord.title,
      }
    : undefined;

  return {
    id: idOf(source._id ?? source.id),
    userId: String(source.userId),
    organizationId: String(source.organizationId),
    projectId: project?.id ?? idOf(rawProject),
    taskId: task?.id ?? idOf(rawTask),
    actorId: actor?.id ?? idOf(rawActor),
    ...(actor ? { actor } : {}),
    ...(project ? { project } : {}),
    ...(task ? { task } : {}),
    type: source.type,
    title: source.title,
    message: source.message,
    isRead: source.isRead,
    metadata: source.metadata ?? {},
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

export async function getNotificationsForUser(
  userId: string,
  page: number,
  limit: number,
  unreadOnly: boolean,
) {
  const skip = (page - 1) * limit;

  const [notifications, total, unread] = await Promise.all([
    findNotificationsByUser(userId, limit, skip, unreadOnly),

    countNotificationsByUser(userId, unreadOnly),

    countUnreadNotificationsByUser(userId),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    notifications: notifications.map((notification) =>
      toNotificationDTO(notification),
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    unreadCount: unread,
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  const notification = await markNotificationAsRead(userId, notificationId);

  if (!notification) {
    return null;
  }

  return toNotificationDTO(notification);
}

export async function markAllNotificationsRead(userId: string) {
  return markAllNotificationsAsRead(userId);
}

export async function notifyTaskAssigned(input: {
  userId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    taskId: input.taskId,
    actorId: input.actorId,
    type: "TASK_ASSIGNED",
    title: "Task assigned to you",
    message: `You were assigned to "${input.taskTitle}"`,
    metadata: {
      taskId: input.taskId,
    },
  });
}

export async function notifyTaskStatusChanged(input: {
  userId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
  from: string;
  to: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    taskId: input.taskId,
    actorId: input.actorId,
    type: "TASK_STATUS_CHANGED",
    title: "Task status changed",
    message: `"${input.taskTitle}" changed from ${input.from} to ${input.to}`,
    metadata: {
      taskId: input.taskId,
      from: input.from,
      to: input.to,
    },
  });
}

export async function notifyCommentCreated(input: {
  userId: string;
  organizationId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  actorId: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    projectId: input.projectId,
    taskId: input.taskId,
    actorId: input.actorId,
    type: "COMMENT_CREATED",
    title: "New comment",
    message: `A new comment was added to "${input.taskTitle}"`,
    metadata: {
      taskId: input.taskId,
    },
  });
}

export async function notifyMemberAdded(input: {
  userId: string;
  organizationId: string;
  orgName: string;
  actorId: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    type: "MEMBER_ADDED",
    title: "Added to organization",
    message: `You were added to "${input.orgName}"`,
  });
}

export async function notifyMemberRoleChanged(input: {
  userId: string;
  organizationId: string;
  orgName: string;
  actorId: string;
  role: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    type: "MEMBER_ROLE_CHANGED",
    title: "Role changed",
    message: `Your role in "${input.orgName}" is now ${input.role}`,
    metadata: {
      role: input.role,
    },
  });
}

export async function notifyOwnershipTransferred(input: {
  userId: string;
  organizationId: string;
  orgName: string;
  actorId: string;
}) {
  if (input.userId === input.actorId) {
    return null;
  }

  return createNotificationForUser({
    userId: input.userId,
    organizationId: input.organizationId,
    actorId: input.actorId,
    type: "OWNERSHIP_TRANSFERRED",
    title: "Ownership transferred",
    message: `You are now the owner of "${input.orgName}"`,
  });
}
