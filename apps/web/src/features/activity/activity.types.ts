export type ActivityType =
  | "ORGANIZATION_CREATED"
  | "MEMBER_ADDED"
  | "MEMBER_ROLE_UPDATED"
  | "MEMBER_REMOVED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "COMMENT_CREATED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED";

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
