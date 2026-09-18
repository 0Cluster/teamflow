import { AppError } from "../../common/errors/app-error.js";
import { findMembershipsByUser } from "../memberships/membership.repository.js";
import { deleteActivitiesByProject } from "../activity/activity.repository.js";
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

export async function listProjectsForUser(userId: string) {
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

export async function deleteProjectForOrganization(
  organizationId: string,
  projectId: string,
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
}
