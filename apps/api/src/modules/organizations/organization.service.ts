import { AppError } from "../../common/errors/app-error.js";
import {
  findMembershipsByUser,
  createMembership,
} from "../memberships/membership.repository.js";
import {
  createOrganization,
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
