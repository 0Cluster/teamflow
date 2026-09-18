import { api } from "../../lib/api.js";

import type {
  Notification,
  NotificationQuery,
  NotificationsResponse,
} from "./notification.types.js";

import type { ApiResponse } from "@teamflow/shared";

export async function listNotifications(
  query: NotificationQuery = {},
): Promise<NotificationsResponse> {
  const response = await api.get<ApiResponse<NotificationsResponse>>(
    "/notifications",
    {
      params: query,
    },
  );

  return response.data.data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<Notification> {
  const response = await api.patch<ApiResponse<Notification>>(
    `/notifications/${notificationId}/read`,
  );

  return response.data.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  modifiedCount: number;
}> {
  const response = await api.patch<ApiResponse<{ modifiedCount: number }>>(
    "/notifications/read-all",
  );

  return response.data.data;
}
