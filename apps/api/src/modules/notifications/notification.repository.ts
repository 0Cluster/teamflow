import { Notification } from "./notification.model.js";
import type { NotificationType } from "./notification.types.js";

interface CreateNotificationData {
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

export async function createNotification(
  data: CreateNotificationData,
) {
  return Notification.create(data);
}

export async function findNotificationsByUser(
  userId: string,
  limit: number,
  skip: number,
  unreadOnly = false,
) {
  const filter: {
    userId: string;
    isRead?: boolean;
  } = {
    userId,
  };

  if (unreadOnly) {
    filter.isRead = false;
  }

  return Notification.find(filter)
    .populate("actorId", "name email")
    .populate("projectId", "name key")
    .populate("taskId", "number title")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}

export async function countNotificationsByUser(
  userId: string,
  unreadOnly = false,
) {
  const filter: {
    userId: string;
    isRead?: boolean;
  } = {
    userId,
  };

  if (unreadOnly) {
    filter.isRead = false;
  }

  return Notification.countDocuments(filter).exec();
}

export async function countUnreadNotificationsByUser(
  userId: string,
) {
  return Notification.countDocuments({
    userId,
    isRead: false,
  }).exec();
}

export async function findNotificationById(
  userId: string,
  notificationId: string,
) {
  return Notification.findOne({
    _id: notificationId,
    userId,
  }).exec();
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      userId,
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      new: true,
    },
  ).exec();
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  return Notification.updateMany(
    {
      userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    },
  ).exec();
}
