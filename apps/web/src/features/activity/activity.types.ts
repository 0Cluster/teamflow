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

export interface ActivityActor {
  id: string;
  name: string;
  email: string;
}

export interface ActivityProject {
  id: string;
  name: string;
  key: string;
}

export interface ActivityTask {
  id: string;
  number: number;
  title: string;
}

export interface Activity {
  id: string;
  organizationId: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string;
  actor?: ActivityActor;
  project?: ActivityProject;
  task?: ActivityTask;
  type: ActivityType;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
