export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_STATUS_CHANGED"
  | "COMMENT_CREATED"
  | "MEMBER_ADDED"
  | "MEMBER_ROLE_CHANGED"
  | "OWNERSHIP_TRANSFERRED";

export interface INotification {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  taskId?: string;
  actorId?: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
