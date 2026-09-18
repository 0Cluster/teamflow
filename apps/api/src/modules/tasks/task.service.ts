import { AppError } from "../../common/errors/app-error.js";
import { addLabelToTask, removeLabelFromTask } from "./task.repository.js";
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
} from "../../socket/socket.events.js";

import {
  notifyTaskAssigned,
  notifyTaskStatusChanged,
} from "../notifications/notification.service.js";
import type { TaskQueryInput } from "./task.schema.js";
import { findLabelById } from "../labels/label.repository.js";
import { findLabelsByIds } from "../labels/label.repository.js";
import { logActivity } from "../activity/activity.service.js";
import { findMembership } from "../memberships/membership.repository.js";
import { findMembershipsByUser } from "../memberships/membership.repository.js";
import { findProjectByOrganizationAndId } from "../projects/project.repository.js";
import {
  createTask,
  deleteTask,
  deleteTasksByProject,
  findLastTaskNumber,
  findTaskById,
  findTasksAssignedToUser,
  findTasksByProject,
  updateTask,
} from "./task.repository.js";
import { deleteCommentsByTask } from "../comments/comment.repository.js";
import { deleteActivitiesByTask } from "../activity/activity.repository.js";
import { findProjectsByIds } from "../projects/project.repository.js";
import type { CreateTaskInput, UpdateTaskInput } from "./task.schema.js";

async function validateLabels(
  organizationId: string,
  labelIds: string[] | undefined,
): Promise<void> {
  if (!labelIds || labelIds.length === 0) {
    return;
  }

  const labels = await findLabelsByIds(organizationId, labelIds);

  if (labels.length !== labelIds.length) {
    throw new AppError(
      400,
      "INVALID_LABELS",
      "One or more labels do not belong to this organization",
    );
  }
}

export async function createTaskForProject(
  organizationId: string,
  projectId: string,
  userId: string,
  input: CreateTaskInput,
) {
  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  if (input.assigneeId) {
    const membership = await findMembership(organizationId, input.assigneeId);

    if (!membership) {
      throw new AppError(
        400,
        "INVALID_ASSIGNEE",
        "Assignee must be a member of the organization",
      );
    }
  }

  const lastTask = await findLastTaskNumber(projectId);

  const number = lastTask ? lastTask.number + 1 : 1;

  await validateLabels(organizationId, input.labelIds);

  try {
    const task = await createTask({
      organizationId,
      projectId,
      number,
      title: input.title,
      description: input.description ?? "",
      priority: input.priority,
      createdBy: userId,
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.labelIds !== undefined ? { labelIds: input.labelIds } : {}),
    });

    await logActivity({
      organizationId,
      projectId,
      taskId: task.id,
      actorId: userId,
      type: "TASK_CREATED",
      metadata: {
        taskNumber: task.number,
        title: task.title,
      },
    });
    const createdTask = {
      id: task.id,
      projectId: task.projectId.toString(),
      number: task.number,
      identifier: `${project.key}-${task.number}`,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() ?? null,
      labelIds: task.labelIds?.map((id) => id.toString()) ?? [],
      createdBy: task.createdBy.toString(),
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    emitTaskCreated(organizationId, projectId, createdTask);

    return createdTask;
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        409,
        "TASK_NUMBER_CONFLICT",
        "Could not generate a unique task number",
      );
    }

    throw error;
  }
}

export async function listTasksForProject(
  organizationId: string,
  projectId: string,
  query: TaskQueryInput,
) {  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const result = await findTasksByProject(organizationId, projectId, query);

  const totalPages = Math.ceil(result.total / query.limit);

  return {
    tasks: result.tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId.toString(),
      number: task.number,
      identifier: `${project.key}-${task.number}`,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() ?? null,
      labelIds: task.labelIds?.map((id) => id.toString()) ?? [],
      createdBy: task.createdBy.toString(),
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}

export async function getTaskForProject(
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

return {
  id: task.id,
  projectId: task.projectId.toString(),
  number: task.number,
  identifier: `${project.key}-${task.number}`,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  assigneeId: task.assigneeId?.toString() ?? null,
  labelIds: task.labelIds?.map((id) => id.toString()) ?? [],
  createdBy: task.createdBy.toString(),
  dueDate: task.dueDate,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
};
}

export async function updateTaskForProject(
  organizationId: string,
  projectId: string,
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
) {
  if (input.assigneeId) {
    const membership = await findMembership(organizationId, input.assigneeId);

    if (!membership) {
      throw new AppError(
        400,
        "INVALID_ASSIGNEE",
        "Assignee must be a member of the organization",
      );
    }
  }

  const project = await findProjectByOrganizationAndId(
    organizationId,
    projectId,
  );

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const existingTask = await findTaskById(organizationId, projectId, taskId);

  if (!existingTask) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  await validateLabels(organizationId, input.labelIds);

  const oldLabelIds = existingTask.labelIds?.map((id) => id.toString()) ?? [];

  const labelsChanged =
    input.labelIds !== undefined &&
    JSON.stringify([...oldLabelIds].sort()) !==
      JSON.stringify([...input.labelIds].map((id) => id.toString()).sort());

  const updateData = {
    ...(input.title !== undefined ? { title: input.title } : {}),

    ...(input.description !== undefined
      ? { description: input.description }
      : {}),

    ...(input.priority !== undefined ? { priority: input.priority } : {}),

    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),

    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),

    ...(input.status !== undefined ? { status: input.status } : {}),

    ...(input.labelIds !== undefined ? { labelIds: input.labelIds } : {}),
  };

  const task = await updateTask(organizationId, projectId, taskId, updateData);

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  // General task update activity.
  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "TASK_UPDATED",
    metadata: {
      fields: Object.keys(updateData),
    },
  });

  // Status change activity.
  if (input.status !== undefined && input.status !== existingTask.status) {
    await logActivity({
      organizationId,
      projectId,
      taskId,
      actorId: userId,
      type: "TASK_STATUS_CHANGED",
      metadata: {
        from: existingTask.status,
        to: input.status,
      },
    });
    if (existingTask.assigneeId) {
      await notifyTaskStatusChanged({
        userId: existingTask.assigneeId.toString(),
        organizationId,
        projectId,
        taskId,
        taskTitle: task.title,
        actorId: userId,
        from: existingTask.status,
        to: input.status,
      });
    }
  }

  // Label change information is already represented
  // by TASK_UPDATED, so don't create another TASK_UPDATED.
  // Instead, include label information in the same update
  // metadata when labels actually changed.
  if (labelsChanged) {
    await logActivity({
      organizationId,
      projectId,
      taskId,
      actorId: userId,
      type: "TASK_UPDATED",
      metadata: {
        field: "labels",
        previousLabelIds: oldLabelIds,
        newLabelIds: input.labelIds ?? [],
      },
    });
  }

  // Assignee change activity.
  if (
    input.assigneeId !== undefined &&
    input.assigneeId !== (existingTask.assigneeId?.toString() ?? null)
  ) {
    await logActivity({
      organizationId,
      projectId,
      taskId,
      actorId: userId,
      type: input.assigneeId === null ? "TASK_UNASSIGNED" : "TASK_ASSIGNED",
      metadata: {
        from: existingTask.assigneeId?.toString() ?? null,
        to: input.assigneeId,
      },
    });

    if (input.assigneeId !== null) {
      await notifyTaskAssigned({
        userId: input.assigneeId,
        organizationId,
        projectId,
        taskId,
        taskTitle: task.title,
        actorId: userId,
      });
    }
  }

  const updatedTask = {
    id: task.id,
    projectId: task.projectId.toString(),
    number: task.number,
    identifier: `${project.key}-${task.number}`,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId?.toString() ?? null,
    labelIds: task.labelIds?.map((id) => id.toString()) ?? [],
    createdBy: task.createdBy.toString(),
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };

  emitTaskUpdated(organizationId, projectId, updatedTask);

  return updatedTask;
}

export async function deleteTaskForProject(
  organizationId: string,
  projectId: string,
  taskId: string,
  userId: string,
): Promise<void> {
  const task = await findTaskById(organizationId, projectId, taskId);

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  await Promise.all([
    deleteCommentsByTask(organizationId, projectId, taskId),
    deleteActivitiesByTask(organizationId, projectId, taskId),
  ]);

  await deleteTask(organizationId, projectId, taskId);

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "TASK_DELETED",
    metadata: {
      taskNumber: task.number,
      title: task.title,
    },
  });

  emitTaskDeleted(organizationId, projectId, taskId);
}

export async function addLabelToTaskForProject(
  organizationId: string,
  projectId: string,
  taskId: string,
  labelId: string,
  userId: string,
) {
  const label = await findLabelById(organizationId, labelId);

  if (!label) {
    throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
  }

  const task = await addLabelToTask(organizationId, projectId, taskId, labelId);

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "TASK_UPDATED",
    metadata: {
      field: "label",
      action: "added",
      labelId,
    },
  });

  return task;
}
export async function removeLabelFromTaskForProject(
  organizationId: string,
  projectId: string,
  taskId: string,
  labelId: string,
  userId: string,
) {
  const label = await findLabelById(organizationId, labelId);

  if (!label) {
    throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
  }

  const task = await removeLabelFromTask(
    organizationId,
    projectId,
    taskId,
    labelId,
  );

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  await logActivity({
    organizationId,
    projectId,
    taskId,
    actorId: userId,
    type: "TASK_UPDATED",
    metadata: {
      field: "label",
      action: "removed",
      labelId,
    },
  });

  return task;
}

export type MyTasksQueryInput = Pick<
  TaskQueryInput,
  | "status"
  | "priority"
  | "search"
  | "page"
  | "limit"
  | "sortBy"
  | "sortOrder"
>;

export async function listMyTasks(
  userId: string,
  query: MyTasksQueryInput,
) {
  const memberships = await findMembershipsByUser(userId);

  const organizationIds = [
    ...new Set(
      memberships.map((membership) => {
        const org = membership.organizationId as unknown;

        if (org && typeof org === "object" && "_id" in org) {
          return String((org as { _id: unknown })._id);
        }

        return String(org);
      }),
    ),
  ];

  if (organizationIds.length === 0) {
    return {
      tasks: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  const result = await findTasksAssignedToUser(
    userId,
    organizationIds,
    query,
  );

  const projectIds = [
    ...new Set(
      result.tasks.map((task) => task.projectId.toString()),
    ),
  ];
  const projects = await findProjectsByIds(projectIds);
  const projectKeyById = new Map(
    projects.map((project) => [project.id, project.key]),
  );

  const totalPages = Math.ceil(result.total / query.limit);

  return {
    tasks: result.tasks.map((task) => ({
      id: task.id,
      organizationId: task.organizationId.toString(),
      projectId: task.projectId.toString(),
      number: task.number,
      identifier: `${projectKeyById.get(task.projectId.toString()) ?? "TASK"}-${task.number}`,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() ?? null,
      labelIds: task.labelIds?.map((id) => id.toString()) ?? [],
      createdBy: task.createdBy.toString(),
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}
