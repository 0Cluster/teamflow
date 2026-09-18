import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import {
  createProjectSchema,
  updateProjectSchema,
} from "./project.schema.js";
import {
  createProjectForOrganization,
  deleteProjectForOrganization,
  getProjectForOrganization,
  listProjectsForOrganization,
  listProjectsForUser,
  updateProjectForOrganization,
} from "./project.service.js";

function getOrganizationId(req: Request): string {
  const organizationId = req.params.organizationId;

  if (typeof organizationId !== "string") {
    throw new AppError(
      400,
      "INVALID_ORGANIZATION_ID",
      "Organization ID must be a string",
    );
  }

  return organizationId;
}

function getProjectId(req: Request): string {
  const projectId = req.params.projectId;

  if (typeof projectId !== "string") {
    throw new AppError(
      400,
      "INVALID_PROJECT_ID",
      "Project ID must be a string",
    );
  }

  return projectId;
}

export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const organizationId = getOrganizationId(req);

  const result = createProjectSchema.safeParse(
    req.body,
  );

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const project =
    await createProjectForOrganization(
      organizationId,
      req.user.id,
      result.data,
    );

  res.status(201).json({
    success: true,
    data: {
      project,
    },
  });
}

export async function listProjects(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getOrganizationId(req);

  const projects =
    await listProjectsForOrganization(
      organizationId,
    );

  res.status(200).json({
    success: true,
    data: {
      projects,
    },
  });
}

export async function listMyProjects(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const projects = await listProjectsForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      projects,
    },
  });
}

export async function getProject(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getOrganizationId(req);
  const projectId = getProjectId(req);

  const project =
    await getProjectForOrganization(
      organizationId,
      projectId,
    );

  res.status(200).json({
    success: true,
    data: {
      project,
    },
  });
}

export async function updateProject(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getOrganizationId(req);
  const projectId = getProjectId(req);

  const result = updateProjectSchema.safeParse(
    req.body,
  );

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const project =
    await updateProjectForOrganization(
      organizationId,
      projectId,
      result.data,
    );

  res.status(200).json({
    success: true,
    data: {
      project,
    },
  });
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getOrganizationId(req);
  const projectId = getProjectId(req);

  await deleteProjectForOrganization(
    organizationId,
    projectId,
  );

  res.status(200).json({
    success: true,
    data: {
      message: "Project deleted successfully",
    },
  });
}
