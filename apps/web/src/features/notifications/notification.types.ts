export type NotificationType =
  "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "COMMENT_CREATED";

export interface NotificationActor {
  id: string;
  name: string;
  email: string;
}

export interface NotificationProject {
  id: string;
  name: string;
  key: string;
}

export interface NotificationTask {
  id: string;
  number: number;
  title: string;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string | null;
  actor?: NotificationActor;
  project?: NotificationProject;
  task?: NotificationTask;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: NotificationPagination;
  unreadCount: number;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}
