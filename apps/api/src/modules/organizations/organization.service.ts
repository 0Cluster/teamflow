import { AppError } from "../../common/errors/app-error.js";
import {
  findMembershipsByUser,
  findMembership,
  createMembership,
  deleteMembershipsByOrganization,
  findUserIdsByOrganization,
} from "../memberships/membership.repository.js";
import { deleteActivitiesByOrganization } from "../activity/activity.repository.js";
import { deleteCommentsByOrganization } from "../comments/comment.repository.js";
import { deleteLabelsByOrganization } from "../labels/label.repository.js";
import { deleteTasksByOrganization } from "../tasks/task.repository.js";
import { deleteProjectsByOrganization } from "../projects/project.repository.js";
import { invalidateMyProjects } from "../projects/project.service.js";
import {
  createOrganization,
  deleteOrganization,
  findOrganizationById,
  findOrganizationBySlug,
} from "./organization.repository.js";
import type {
  CreateOrganizationInput,
} from "./organization.schema.js";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganizationForUser(
  userId: string,
  input: CreateOrganizationInput,
) {
  const baseSlug = generateSlug(input.name);

  if (!baseSlug) {
    throw new AppError(
      400,
      "INVALID_ORGANIZATION_NAME",
      "Organization name cannot produce a valid slug",
    );
  }

  let slug = baseSlug;

  const existingOrganization =
    await findOrganizationBySlug(slug);

  if (existingOrganization) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  const organization = await createOrganization({
    name: input.name,
    slug,
    ownerId: userId,
  });

  await createMembership({
    organizationId: organization.id,
    userId,
    role: "OWNER",
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    ownerId: organization.ownerId.toString(),
    createdAt: organization.createdAt,
  };
}

export async function getOrganizationsForUser(
  userId: string,
) {
  const memberships =
    await findMembershipsByUser(userId);

  return memberships.map((membership) => {
    const organization = membership.organizationId as unknown as {
      _id: string;
      name: string;
      slug: string;
      ownerId: string;
    };

    return {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      ownerId: organization.ownerId.toString(),
      role: membership.role,
    };
  });
}

export async function getOrganizationById(
  organizationId: string,
) {
  const organization =
    await findOrganizationById(organizationId);

  if (!organization) {
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Organization not found",
    );
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    ownerId: organization.ownerId.toString(),
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export async function deleteOrganizationForUser(
  organizationId: string,
  userId: string,
): Promise<void> {
  const organization =
    await findOrganizationById(organizationId);

  if (!organization) {
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Organization not found",
    );
  }

  const membership = await findMembership(organizationId, userId);

  if (!membership) {
    throw new AppError(
      403,
      "ORGANIZATION_ACCESS_DENIED",
      "You are not a member of this organization",
    );
  }

  if (membership.role !== "OWNER") {
    throw new AppError(
      403,
      "ORGANIZATION_PERMISSION_DENIED",
      "Only the organization owner can delete this organization",
    );
  }

  const formerMemberIds = await findUserIdsByOrganization(
    organizationId,
  );

  await Promise.all([
    deleteCommentsByOrganization(organizationId),
    deleteActivitiesByOrganization(organizationId),
    deleteTasksByOrganization(organizationId),
    deleteProjectsByOrganization(organizationId),
    deleteLabelsByOrganization(organizationId),
    deleteMembershipsByOrganization(organizationId),
  ]);

  await deleteOrganization(organizationId);

  await invalidateMyProjects(formerMemberIds);
}
