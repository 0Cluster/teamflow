import { Membership } from "./membership.model.js";

export async function createMembership(data: {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}) {
  return Membership.create(data);
}

export async function findMembership(
  organizationId: string,
  userId: string,
) {
  return Membership.findOne({
    organizationId,
    userId,
  }).exec();
}

export async function findMembershipsByOrganization(
  organizationId: string,
) {
  return Membership.find({ organizationId })
    .populate("userId", "name email role")
    .sort({ createdAt: 1 })
    .exec();
}

export async function findMembershipsByUser(
  userId: string,
) {
  return Membership.find({ userId })
    .populate("organizationId", "name slug ownerId")
    .sort({ createdAt: -1 })
    .exec();
}

export async function updateMembershipRole(
  organizationId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER",
): Promise<void> {
  await Membership.updateOne(
    {
      organizationId,
      userId,
    },
    {
      $set: {
        role,
      },
    },
  ).exec();
}

export async function deleteMembership(
  organizationId: string,
  userId: string,
): Promise<void> {
  await Membership.deleteOne({
    organizationId,
    userId,
  }).exec();
}

export async function deleteMembershipsByOrganization(
  organizationId: string,
): Promise<void> {
  await Membership.deleteMany({
    organizationId,
  }).exec();
}
