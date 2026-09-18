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
    notification,
  );

  return notification;
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
    notifications,
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
  return markNotificationAsRead(userId, notificationId);
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
