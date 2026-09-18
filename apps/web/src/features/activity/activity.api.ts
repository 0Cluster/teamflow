import { api } from "../../lib/api.js";

import type {
  Activity,
  ActivityActor,
  ActivityProject,
  ActivityTask,
} from "./activity.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface BackendActor {
  _id: string;
  name: string;
  email: string;
}

interface BackendProject {
  _id: string;
  name: string;
  key: string;
}

interface BackendTask {
  _id: string;
  number: number;
  title: string;
}

interface BackendActivity {
  _id: string;
  organizationId: string;
  projectId: string | BackendProject | null;
  taskId: string | BackendTask | null;
  actorId: string | BackendActor;
  type: Activity["type"];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function normalizeActivity(activity: BackendActivity): Activity {
  let actorId: string;
  let actor: ActivityActor | undefined;

  if (typeof activity.actorId === "string") {
    actorId = activity.actorId;
  } else {
    actorId = activity.actorId._id;

    actor = {
      id: activity.actorId._id,
      name: activity.actorId.name,
      email: activity.actorId.email,
    };
  }

  let projectId: string | null = null;
  let project: ActivityProject | undefined;

  if (typeof activity.projectId === "string") {
    projectId = activity.projectId;
  } else if (activity.projectId) {
    projectId = activity.projectId._id;

    project = {
      id: activity.projectId._id,
      name: activity.projectId.name,
      key: activity.projectId.key,
    };
  }

  let taskId: string | null = null;
  let task: ActivityTask | undefined;

  if (typeof activity.taskId === "string") {
    taskId = activity.taskId;
  } else if (activity.taskId) {
    taskId = activity.taskId._id;

    task = {
      id: activity.taskId._id,
      number: activity.taskId.number,
      title: activity.taskId.title,
    };
  }

  return {
    id: activity._id,
    organizationId: activity.organizationId,
    projectId,
    taskId,
    actorId,
    actor,
    project,
    task,
    type: activity.type,
    metadata: activity.metadata ?? {},
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };
}

export async function listOrganizationActivity(
  organizationId: string,
  limit = 50,
): Promise<Activity[]> {
  const response = await api.get<ApiResponse<BackendActivity[]>>(
    `/organizations/${organizationId}/activity`,
    {
      params: { limit },
    },
  );

  return response.data.data.map(normalizeActivity);
}

export async function listProjectActivity(
  organizationId: string,
  projectId: string,
  limit = 50,
): Promise<Activity[]> {
  const response = await api.get<ApiResponse<BackendActivity[]>>(
    `/organizations/${organizationId}/projects/${projectId}/activity`,
    {
      params: { limit },
    },
  );

  return response.data.data.map(normalizeActivity);
}

export async function listTaskActivity(
  organizationId: string,
  projectId: string,
  taskId: string,
  limit = 50,
): Promise<Activity[]> {
  const response = await api.get<ApiResponse<BackendActivity[]>>(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/activity`,
    {
      params: { limit },
    },
  );

  return response.data.data.map(normalizeActivity);
}
