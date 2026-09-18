import { AppError } from "../../common/errors/app-error.js";
import {
  findMembershipsByUser,
  findUserIdsByOrganization,
} from "../memberships/membership.repository.js";
import { cacheDel, cacheGet, cacheSet } from "../../common/cache/cache.js";
import { deleteActivitiesByProject } from "../activity/activity.repository.js";
import { logActivity } from "../activity/activity.service.js";
import {
  emitProjectCreated,
  emitProjectDeleted,
  emitProjectUpdated,
} from "../../socket/socket.events.js";
import { deleteCommentsByProject } from "../comments/comment.repository.js";
import { deleteTasksByProject } from "../tasks/task.repository.js";
import {
  createProject,
  deleteProject,
  findProjectByOrganizationAndId,
  findProjectsByOrganization,
  findProjectsByOrganizationIds,
  updateProject,
} from "./project.repository.js";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.schema.js";

export const MY_PROJECTS_CACHE_TTL_SECONDS = 60;

export function myProjectsCacheKey(userId: string): string {
  return `my-projects:${userId}`;
}

interface ProjectDocumentLike {
  id: string;
  organizationId: { toString(): string };
  name: string;
  key: string;
  description?: string;
  createdBy: { toString(): string };
  createdAt: unknown;
  updatedAt: unknown;
}

export function toProjectList(projects: ProjectDocumentLike[]) {
  return projects.map((project) => ({
    id: project.id,
    organizationId: project.organizationId.toString(),
    name: project.name,
    key: project.key,
    description: project.description,
    createdBy: project.createdBy.toString(),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

export async function invalidateMyProjects(
  userIds: string[],
): Promise<void> {
  await cacheDel(userIds.map(myProjectsCacheKey));
}

export async function invalidateMyProjectsForOrganization(
  organizationId: string,
): Promise<void> {
  await invalidateMyProjects(
    await findUserIdsByOrganization(organizationId),
  );
}

export async function createProjectForOrganization(
  organizationId: string,
  userId: string,
  input: CreateProjectInput,
) {
  try {
    const project = await createProject({
      organizationId,
      name: input.name,
      key: input.key,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      createdBy: userId,
    });

    await logActivity({
      organizationId,
      projectId: project.id,
      actorId: userId,
      type: "PROJECT_CREATED",
      metadata: {
        name: project.name,
        key: project.key,
      },
    });

    const createdProject = {
      id: project.id,
      organizationId: project.organizationId.toString(),
      name: project.name,
      key: project.key,
      description: project.description,
      createdBy: project.createdBy.toString(),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    emitProjectCreated(organizationId, createdProject);

    await invalidateMyProjectsForOrganization(organizationId);

    return createdProject;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        409,
        "PROJECT_KEY_ALREADY_EXISTS",
        "A project with this key already exists in this organization",
      );
    }

    throw error;
  }
}

export async function listProjectsForOrganization(organizationId: string) {
  const projects = await findProjectsByOrganization(organizationId);

  return toProjectList(projects);
}

export async function listProjectsForUser(userId: string) {
  const cacheKey = myProjectsCacheKey(userId);
  const cached = await cacheGet<ReturnType<typeof toProjectList>>(
    cacheKey,
  );

  if (cached !== null) {
    return cached;
  }

  const memberships = await findMembershipsByUser(userId);

  const organizationIds = [
    ...new Set(
      memberships.map((membership) => {
        const org = membership.organizationId as unknown;

        if (
          org &&
          typeof org === "object" &&
          "_id" in org
        ) {
          return String(
            (org as { _id: unknown })._id,
          );
        }

        return String(org);
      }),
    ),
  ];

  const projects =
    organizationIds.length === 0
      ? []
      : await findProjectsByOrganizationIds(organizationIds);

  const result = toProjectList(projects);

  await cacheSet(cacheKey, result, MY_PROJECTS_CACHE_TTL_SECONDS);

  return result;
}

export async function getProjectForOrganization(
  organizationId: string,
  projectId: string,
) {
  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  return {
    id: project.id,
    organizationId: project.organizationId.toString(),
    name: project.name,
    key: project.key,
    description: project.description,
    createdBy: project.createdBy.toString(),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function updateProjectForOrganization(
  organizationId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  const updateData = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
  };

  const project = await updateProject(organizationId, projectId, updateData);

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const updatedProject = {
    id: project.id,
    organizationId: project.organizationId.toString(),
    name: project.name,
    key: project.key,
    description: project.description,
    createdBy: project.createdBy.toString(),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  emitProjectUpdated(organizationId, updatedProject);

  await invalidateMyProjectsForOrganization(organizationId);

  return updatedProject;
}

export async function deleteProjectForOrganization(
  organizationId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  await Promise.all([
    deleteCommentsByProject(organizationId, projectId),
    deleteActivitiesByProject(organizationId, projectId),
    deleteTasksByProject(organizationId, projectId),
  ]);

  await deleteProject(organizationId, projectId);

  emitProjectDeleted(organizationId, projectId);

  await invalidateMyProjectsForOrganization(organizationId);

  await logActivity({
    organizationId,
    actorId: userId,
    type: "PROJECT_DELETED",
    metadata: {
      projectId,
      name: project.name,
      key: project.key,
    },
  });
}
