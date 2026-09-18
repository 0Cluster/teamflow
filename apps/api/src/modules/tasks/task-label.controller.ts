import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import { getParam } from "../../common/utils/get-param.js";
import {
  addLabelToTaskForProject,
  removeLabelFromTaskForProject,
} from "./task.service.js";

export async function addTaskLabel(
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

  const labelId = getParam(
    req,
    "labelId",
  );

  const task =
    await addLabelToTaskForProject(
      organizationId,
      projectId,
      taskId,
      labelId,
      req.user.id,
    );

  res.status(200).json({
    success: true,
    data: task,
  });
}

export async function removeTaskLabel(
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

  const labelId = getParam(
    req,
    "labelId",
  );

  const task =
    await removeLabelFromTaskForProject(
      organizationId,
      projectId,
      taskId,
      labelId,
      req.user.id,
    );

  res.status(200).json({
    success: true,
    data: task,
  });
}
