import { Task } from "./task.model.js";
import type { SortOrder } from "mongoose";
import { escapeRegExp } from "../../utils/regex.js";

interface FindTasksOptions {
  status?: string | undefined;
  priority?: string | undefined;
  assigneeId?: string | undefined;
  labelId?: string | undefined;
  search?: string | undefined;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/*
 * Builds a literal-text $or search clause. Exported for unit
 * testing; both task finders share it so neither can drift
 * back to raw user input in $regex.
 */
export function buildTaskSearchFilter(search: string) {
  const escaped = escapeRegExp(search);

  return [
    {
      title: {
        $regex: escaped,
        $options: "i",
      },
    },
    {
      description: {
        $regex: escaped,
        $options: "i",
      },
    },
  ];
}

export async function createTask(data: {
  organizationId: string;
  projectId: string;
  number: number;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
  labelIds?: string[];
  createdBy: string;
  dueDate?: Date;
}) {
  return Task.create(data);
}

export async function findTasksByProject(
  organizationId: string,
  projectId: string,
  options: FindTasksOptions,
) {
  const filter: Record<string, unknown> = {
    organizationId,
    projectId,
  };

  if (options.status !== undefined) {
    filter.status = options.status;
  }

  if (options.priority !== undefined) {
    filter.priority = options.priority;
  }

  if (options.assigneeId !== undefined) {
    filter.assigneeId = options.assigneeId;
  }

  if (options.labelId !== undefined) {
    filter.labelIds = options.labelId;
  }

  if (options.search !== undefined && options.search.length > 0) {
    filter.$or = buildTaskSearchFilter(options.search);
  }

  const skip = (options.page - 1) * options.limit;

  const sortDirection: SortOrder = options.sortOrder === "asc" ? 1 : -1;

  const sort = {
    [options.sortBy]: sortDirection,
  };

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("assigneeId", "name email")
      .populate("labelIds", "name color")
      .sort(sort)
      .skip(skip)
      .limit(options.limit)
      .exec(),

    Task.countDocuments(filter).exec(),
  ]);

  return {
    tasks,
    total,
  };
}

export async function findTaskById(
  organizationId: string,
  projectId: string,
  taskId: string,
) {
  return Task.findOne({
    _id: taskId,
    organizationId,
    projectId,
  })
    .exec();
}

export async function findLastTaskNumber(projectId: string) {
  return Task.findOne({
    projectId,
  })
    .sort({
      number: -1,
    })
    .select("number")
    .exec();
}

export async function updateTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assigneeId?: string | null;
    dueDate?: Date | null;
    status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  },
) {
  return Task.findOneAndUpdate(
    {
      _id: taskId,
      organizationId,
      projectId,
    },
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
}

export async function deleteTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await Task.deleteOne({
    _id: taskId,
    organizationId,
    projectId,
  }).exec();
}

export async function deleteTasksByProject(
  organizationId: string,
  projectId: string,
): Promise<void> {
  await Task.deleteMany({
    organizationId,
    projectId,
  }).exec();
}

export async function deleteTasksByOrganization(
  organizationId: string,
): Promise<void> {
  await Task.deleteMany({
    organizationId,
  }).exec();
}

export async function addLabelToTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  labelId: string,
) {
  return Task.findOneAndUpdate(
    {
      _id: taskId,
      organizationId,
      projectId,
    },
    {
      $addToSet: {
        labelIds: labelId,
      },
    },
    {
      new: true,
    },
  )
    .populate("labelIds", "name color")
    .exec();
}

export async function removeLabelFromTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  labelId: string,
) {
  return Task.findOneAndUpdate(
    {
      _id: taskId,
      organizationId,
      projectId,
    },
    {
      $pull: {
        labelIds: labelId,
      },
    },
    {
      new: true,
    },
  )
    .populate("labelIds", "name color")
    .exec();
}

export async function findTaskByIdForSocket(
  taskId: string,
) {
  return Task.findById(taskId).exec();
}

export async function findTasksAssignedToUser(
  userId: string,
  organizationIds: string[],
  options: Pick<
    FindTasksOptions,
    | "status"
    | "priority"
    | "search"
    | "page"
    | "limit"
    | "sortBy"
    | "sortOrder"
  >,
) {
  if (organizationIds.length === 0) {
    return { tasks: [], total: 0 };
  }

  const filter: Record<string, unknown> = {
    organizationId: { $in: organizationIds },
    assigneeId: userId,
  };

  if (options.status !== undefined) {
    filter.status = options.status;
  }

  if (options.priority !== undefined) {
    filter.priority = options.priority;
  }

  if (options.search !== undefined && options.search.length > 0) {
    filter.$or = buildTaskSearchFilter(options.search);
  }

  const skip = (options.page - 1) * options.limit;

  const sortDirection: SortOrder = options.sortOrder === "asc" ? 1 : -1;

  const sort = {
    [options.sortBy]: sortDirection,
  };

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(options.limit).exec(),
    Task.countDocuments(filter).exec(),
  ]);

  return { tasks, total };
}
