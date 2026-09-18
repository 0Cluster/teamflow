import { Activity } from "./activity.model.js";
import type { ActivityType } from "./activity.types.js";

interface CreateActivityData {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
}

export async function createActivity(
  data: CreateActivityData,
) {
  return Activity.create(data);
}

export async function findActivitiesByOrganization(
  organizationId: string,
  limit = 50,
) {
  return Activity.find({
    organizationId,
  })
    .populate("actorId", "name email")
    .populate("projectId", "name key")
    .populate("taskId", "number title")
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
}

export async function findActivitiesByProject(
  organizationId: string,
  projectId: string,
  limit = 50,
) {
  return Activity.find({
    organizationId,
    projectId,
  })
    .populate("actorId", "name email")
    .populate("taskId", "number title")
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
}

export async function findActivitiesByTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  limit = 50,
) {
  return Activity.find({
    organizationId,
    projectId,
    taskId,
  })
    .populate("actorId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
}

export async function deleteActivitiesByTask(
  organizationId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await Activity.deleteMany({
    organizationId,
    projectId,
    taskId,
  }).exec();
}

export async function deleteActivitiesByProject(
  organizationId: string,
  projectId: string,
): Promise<void> {
  await Activity.deleteMany({
    organizationId,
    projectId,
  }).exec();
}
