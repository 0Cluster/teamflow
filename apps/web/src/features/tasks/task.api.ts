import { api } from "../../lib/api.js";

import type {
  CreateTaskInput,
  Task,
  TasksResponse,
  UpdateTaskInput,
} from "./task.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface TaskPayload {
  task: Task;
}

export interface TaskQueryParams {
  status?: string;
  priority?: string;
  assigneeId?: string;
  labelId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function listTasks(
  organizationId: string,
  projectId: string,
  params?: TaskQueryParams,
): Promise<TasksResponse> {
  const response = await api.get<ApiResponse<TasksResponse>>(
    `/organizations/${organizationId}/projects/${projectId}/tasks`,
    {
      params,
    },
  );

  return response.data.data;
}

export async function listMyTasks(
  params?: TaskQueryParams,
): Promise<TasksResponse> {
  const response = await api.get<ApiResponse<TasksResponse>>(
    "/tasks",
    {
      params,
    },
  );

  return response.data.data;
}

export async function getTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<Task> {
  const response = await api.get<ApiResponse<TaskPayload>>(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
  );

  return response.data.data.task;
}

export async function createTask(
  organizationId: string,
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const response = await api.post<ApiResponse<TaskPayload>>(
    `/organizations/${organizationId}/projects/${projectId}/tasks`,
    input,
  );

  return response.data.data.task;
}

export async function updateTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const response = await api.patch<ApiResponse<TaskPayload>>(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
    input,
  );

  return response.data.data.task;
}

export async function deleteTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await api.delete(
    `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`,
  );
}
