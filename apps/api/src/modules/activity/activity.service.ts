import {
  createActivity,
  findActivitiesByOrganization,
  findActivitiesByProject,
  findActivitiesByTask,
} from "./activity.repository.js";

import { emitActivity } from "../../socket/socket.events.js";
import type {
  ActivityType,
} from "./activity.types.js";

interface LogActivityInput {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
}

export async function logActivity(
  input: LogActivityInput,
) {
  const activity = await createActivity(input);

  emitActivity(
    input.organizationId,
    activity,
  );

  return activity;
}

export async function getOrganizationActivity(
  organizationId: string,
  limit = 50,
) {
  return findActivitiesByOrganization(
    organizationId,
    limit,
  );
}

export async function getProjectActivity(
  organizationId: string,
  projectId: string,
  limit = 50,
) {
  return findActivitiesByProject(
    organizationId,
    projectId,
    limit,
  );
}

export async function getTaskActivity(
  organizationId: string,
  projectId: string,
  taskId: string,
  limit = 50,
) {
  return findActivitiesByTask(
    organizationId,
    projectId,
    taskId,
    limit,
  );
}
