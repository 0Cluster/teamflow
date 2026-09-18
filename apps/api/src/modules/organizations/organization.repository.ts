import { Organization } from "./organization.model.js";

export async function createOrganization(data: {
  name: string;
  slug: string;
  ownerId: string;
}) {
  return Organization.create(data);
}

export async function findOrganizationBySlug(
  slug: string,
) {
  return Organization.findOne({ slug }).exec();
}

export async function findOrganizationById(
  organizationId: string,
) {
  return Organization.findById(organizationId).exec();
}

export async function findOrganizationsByOwner(
  ownerId: string,
) {
  return Organization.find({ ownerId })
    .sort({ createdAt: -1 })
    .exec();
}

export async function updateOrganizationOwner(
  organizationId: string,
  ownerId: string,
): Promise<void> {
  await Organization.updateOne(
    {
      _id: organizationId,
    },
    {
      $set: {
        ownerId,
      },
    },
  ).exec();
}
