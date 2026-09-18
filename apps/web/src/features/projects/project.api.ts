import { api } from "../../lib/api.js";

import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "./project.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface ProjectsPayload {
  projects: Project[];
}

interface ProjectPayload {
  project: Project;
}

interface MessagePayload {
  message: string;
}

export async function listProjects(
  organizationId: string,
): Promise<Project[]> {
  const response = await api.get<ApiResponse<ProjectsPayload>>(
    `/organizations/${organizationId}/projects`,
  );

  return response.data.data.projects;
}

export async function listMyProjects(): Promise<Project[]> {
  const response = await api.get<ApiResponse<ProjectsPayload>>(
    "/projects",
  );

  return response.data.data.projects;
}

export async function getProject(
  organizationId: string,
  projectId: string,
): Promise<Project> {
  const response = await api.get<ApiResponse<ProjectPayload>>(
    `/organizations/${organizationId}/projects/${projectId}`,
  );

  return response.data.data.project;
}

export async function createProject(
  organizationId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const response = await api.post<ApiResponse<ProjectPayload>>(
    `/organizations/${organizationId}/projects`,
    input,
  );

  return response.data.data.project;
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const response = await api.patch<ApiResponse<ProjectPayload>>(
    `/organizations/${organizationId}/projects/${projectId}`,
    input,
  );

  return response.data.data.project;
}

export async function deleteProject(
  organizationId: string,
  projectId: string,
): Promise<string> {
  const response = await api.delete<ApiResponse<MessagePayload>>(
    `/organizations/${organizationId}/projects/${projectId}`,
  );

  return response.data.data.message;
}
