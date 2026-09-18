import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.schema.js";
import {
  createCommentForTask,
  deleteCommentForTask,
  listCommentsForTask,
  updateCommentForTask,
} from "./comment.service.js";

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

export async function createComment(
  req: Request,
  res: Response,
) {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

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

    const input = createCommentSchema.parse(req.body);

    const comment = await createCommentForTask(
      organizationId,
      projectId,
      taskId,
      req.user.id,
      input.content,
    );

    res.status(201).json({
      success: true,
      data: comment,
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

export async function listComments(
  req: Request,
  res: Response,
) {
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

  const comments = await listCommentsForTask(
    organizationId,
    projectId,
    taskId,
  );

  res.json({
    success: true,
    data: comments,
  });
}

export async function updateComment(
  req: Request,
  res: Response,
) {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

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

    const commentId = getParam(
      req.params.commentId,
      "commentId",
    );

    const input = updateCommentSchema.parse(req.body);

    const comment = await updateCommentForTask(
      organizationId,
      projectId,
      taskId,
      commentId,
      req.user.id,
      input.content,
    );

    res.json({
      success: true,
      data: comment,
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

export async function deleteComment(
  req: Request,
  res: Response,
) {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

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

  const commentId = getParam(
    req.params.commentId,
    "commentId",
  );

  await deleteCommentForTask(
    organizationId,
    projectId,
    taskId,
    commentId,
    req.user.id,
  );

  res.status(204).send();
}
