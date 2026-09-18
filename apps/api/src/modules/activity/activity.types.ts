export type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ASSIGNED"
  | "TASK_UNASSIGNED"
  | "TASK_DELETED"
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "MEMBER_ADDED"
  | "MEMBER_ROLE_CHANGED"
  | "MEMBER_REMOVED"
  | "OWNERSHIP_TRANSFERRED"
  | "LABEL_CREATED"
  | "LABEL_UPDATED"
  | "LABEL_DELETED";

export interface IActivity {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  type: ActivityType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
