import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { activityQuerySchema } from "./activity.schema.js";
import {
  getOrganizationActivity,
  getProjectActivity,
  getTaskActivity,
} from "./activity.service.js";

function getParam(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string") {
    throw new AppError(
      400,
      "INVALID_PARAMETER",
      `${name} is required`,
    );
  }

  return value;
}

export async function listOrganizationActivity(
  req: Request,
  res: Response,
) {
  try {
    const organizationId = getParam(
      req.params.organizationId,
      "organizationId",
    );

    const { limit } = activityQuerySchema.parse(
      req.query,
    );

    const activities =
      await getOrganizationActivity(
        organizationId,
        limit,
      );

    res.json({
      success: true,
      data: activities,
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

export async function listProjectActivity(
  req: Request,
  res: Response,
) {
  try {
    const organizationId = getParam(
      req.params.organizationId,
      "organizationId",
    );

    const projectId = getParam(
      req.params.projectId,
      "projectId",
    );

    const { limit } = activityQuerySchema.parse(
      req.query,
    );

    const activities =
      await getProjectActivity(
        organizationId,
        projectId,
        limit,
      );

    res.json({
      success: true,
      data: activities,
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

export async function listTaskActivity(
  req: Request,
  res: Response,
) {
  try {
    const organizationId = getParam(
      req.params.organizationId,
      "organizationId",
    );

    const projectId = getParam(
      req.params.projectId,
      "projectId",
    );

    const taskId = getParam(
      req.params.taskId,
      "taskId",
    );

    const { limit } = activityQuerySchema.parse(
      req.query,
    );

    const activities =
      await getTaskActivity(
        organizationId,
        projectId,
        taskId,
        limit,
      );

    res.json({
      success: true,
      data: activities,
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
