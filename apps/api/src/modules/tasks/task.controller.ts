import type { Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../common/errors/app-error.js";
import { getParam } from "../../common/utils/get-param.js";
import {
  createTaskSchema,
  myTasksQuerySchema,
  taskQuerySchema,
  updateTaskSchema,
} from "./task.schema.js";
import {
  createTaskForProject,
  deleteTaskForProject,
  getTaskForProject,
  listMyTasks as listMyTasksForUser,
  listTasksForProject,
  updateTaskForProject,
} from "./task.service.js";

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

function getTaskId(req: Request): string {
  const taskId = req.params.taskId;

  if (typeof taskId !== "string") {
    throw new AppError(
      400,
      "INVALID_TASK_ID",
      "Task ID must be a string",
    );
  }

  return taskId;
}

export async function createTask(
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
  const projectId = getProjectId(req);

  const result = createTaskSchema.safeParse(
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

  const task = await createTaskForProject(
    organizationId,
    projectId,
    req.user.id,
    result.data,
  );

  res.status(201).json({
    success: true,
    data: {
      task,
    },
  });
}

export async function listTasks(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const organizationId = getParam(
      req,
      "organizationId",
    );

    const projectId = getParam(
      req,
      "projectId",
    );

    const query = taskQuerySchema.parse(
      req.query,
    );

    const result =
      await listTasksForProject(
        organizationId,
        projectId,
        query,
      );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.issues,
        },
      });

      return;
    }

    throw error;
  }
}

export async function listMyTasks(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const query = myTasksQuerySchema.parse(req.query);

    const result = await listMyTasksForUser(req.user.id, query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.issues,
        },
      });

      return;
    }

    throw error;
  }
}

export async function getTask(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getOrganizationId(req);
  const projectId = getProjectId(req);
  const taskId = getTaskId(req);

  const task = await getTaskForProject(
    organizationId,
    projectId,
    taskId,
  );

  res.status(200).json({
    success: true,
    data: {
      task,
    },
  });
}

export async function updateTask(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const organizationId = getParam(
      req,
      "organizationId",
    );

    const projectId = getParam(
      req,
      "projectId",
    );

    const taskId = getParam(
      req,
      "taskId",
    );

    const input = updateTaskSchema.parse(req.body);

    const task = await updateTaskForProject(
      organizationId,
      projectId,
      taskId,
      req.user.id,
      input,
    );

    res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.issues,
        },
      });
      return;
    }

    throw error;
  }
}
export async function deleteTask(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const organizationId = getParam(
      req,
      "organizationId",
    );

    const projectId = getParam(
      req,
      "projectId",
    );

    const taskId = getParam(
      req,
      "taskId",
    );

    await deleteTaskForProject(
      organizationId,
      projectId,
      taskId,
      req.user.id,
    );

    res.status(204).send();
  } catch (error) {
    throw error;
  }
}
