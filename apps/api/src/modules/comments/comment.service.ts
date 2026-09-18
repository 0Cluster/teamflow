import { AppError } from "../../common/errors/app-error.js";
import { notifyCommentCreated } from "../notifications/notification.service.js";
import { logActivity } from "../activity/activity.service.js";
import { findMembership } from "../memberships/membership.repository.js";
import { findProjectByOrganizationAndId } from "../projects/project.repository.js";
import { findTaskById } from "../tasks/task.repository.js";
import {
  createComment,
  deleteComment,
  findCommentById,
  findCommentsByTask,
  updateComment,
} from "./comment.repository.js";

import {
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
} from "../../socket/socket.events.js";

async function validateTaskAccess(
  organizationId: string,
  projectId: string,
  taskId: string,
) {
  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const task = await findTaskById(organizationId, projectId, taskId);

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  return task;
}

export async function createCommentForTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  authorId: string,
  content: string,
) {
  const task = await validateTaskAccess(organizationId, projectId, taskId);

  const comment = await createComment({
    organizationId,
    projectId,
    taskId,
    authorId,
    content,
  });

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: authorId,
    type: "COMMENT_CREATED",
    metadata: {
      commentId: comment.id,
    },
  });

  const recipients = new Set<string>();

  if (task.createdBy.toString() !== authorId) {
    recipients.add(task.createdBy.toString());
  }

  if (task.assigneeId && task.assigneeId.toString() !== authorId) {
    recipients.add(task.assigneeId.toString());
  }

  await Promise.all(
    [...recipients].map((userId) =>
      notifyCommentCreated({
        userId,
        organizationId,
        projectId,
        taskId,
        taskTitle: task.title,
        actorId: authorId,
      }),
    ),
  );

  emitCommentCreated(organizationId, projectId, comment);

  return comment;
}

export async function listCommentsForTask(
  organizationId: string,
  projectId: string,
  taskId: string,
) {
  await validateTaskAccess(organizationId, projectId, taskId);

  return findCommentsByTask(organizationId, projectId, taskId);
}

export async function updateCommentForTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  userId: string,
  content: string,
) {
  await validateTaskAccess(organizationId, projectId, taskId);

  const comment = await findCommentById(
    organizationId,
    projectId,
    taskId,
    commentId,
  );

  if (!comment) {
    throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  if (comment.authorId.toString() !== userId) {
    throw new AppError(
      403,
      "COMMENT_EDIT_FORBIDDEN",
      "You can only edit your own comments",
    );
  }

  const updatedComment = await updateComment(
    organizationId,
    projectId,
    taskId,
    commentId,
    content,
  );

  if (!updatedComment) {
    throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
  }

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "COMMENT_UPDATED",
    metadata: {
      commentId,
    },
  });

  emitCommentUpdated(organizationId, projectId, updatedComment);

  return updatedComment;
}

export async function deleteCommentForTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  userId: string,
) {
  await validateTaskAccess(organizationId, projectId, taskId);

  const comment = await findCommentById(
    organizationId,
    projectId,
    taskId,
    commentId,
  );

  if (!comment) {
    throw new AppError(
      404,
      "COMMENT_NOT_FOUND",
      "Comment not found",
    );
  }

  const membership = await findMembership(
    organizationId,
    userId,
  );

  if (!membership) {
    throw new AppError(
      403,
      "ORGANIZATION_ACCESS_DENIED",
      "You are not a member of this organization",
    );
  }

  const isAuthor =
    comment.authorId.toString() === userId;

  const isAdmin =
    membership.role === "OWNER" ||
    membership.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw new AppError(
      403,
      "COMMENT_DELETE_FORBIDDEN",
      "You can only delete your own comments",
    );
  }

  const deletedComment = await deleteComment(
    organizationId,
    projectId,
    taskId,
    commentId,
  );

  if (!deletedComment) {
    throw new AppError(
      404,
      "COMMENT_NOT_FOUND",
      "Comment not found",
    );
  }

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "COMMENT_DELETED",
    metadata: {
      commentId,
    },
  });

  emitCommentDeleted(
    organizationId,
    projectId,
    {
      commentId,
    },
  );

  return deletedComment;
}
