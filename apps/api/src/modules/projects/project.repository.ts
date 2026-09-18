import { Project } from "./project.model.js";

export async function createProject(data: {
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  createdBy: string;
}) {
  return Project.create(data);
}

export async function findProjectsByOrganization(
  organizationId: string,
) {
  return Project.find({
    organizationId,
  })
    .sort({ createdAt: -1 })
    .exec();
}

export async function findProjectsByOrganizationIds(
  organizationIds: string[],
) {
  if (organizationIds.length === 0) {
    return [];
  }

  return Project.find({
    organizationId: { $in: organizationIds },
  })
    .sort({ createdAt: -1 })
    .exec();
}

export async function findProjectsByIds(projectIds: string[]) {
  if (projectIds.length === 0) {
    return [];
  }

  return Project.find({
    _id: { $in: projectIds },
  }).exec();
}

export async function findProjectById(
  projectId: string,
) {
  return Project.findById(projectId).exec();
}

export async function findProjectByOrganizationAndId(
  organizationId: string,
  projectId: string,
) {
  return Project.findOne({
    _id: projectId,
    organizationId,
  }).exec();
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  data: {
    name?: string;
    description?: string;
  },
) {
  return Project.findOneAndUpdate(
    {
      _id: projectId,
      organizationId,
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

export async function deleteProject(
  organizationId: string,
  projectId: string,
): Promise<void> {
  await Project.deleteOne({
    _id: projectId,
    organizationId,
  }).exec();
}
