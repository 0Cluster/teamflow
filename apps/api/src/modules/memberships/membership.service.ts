import { AppError } from "../../common/errors/app-error.js";
import { findUserByEmail, findUserById } from "../users/user.repository.js";
import {
  createMembership,
  deleteMembership,
  findMembership,
  updateMembershipRole,
} from "./membership.repository.js";
import { updateOrganizationOwner } from "../organizations/organization.repository.js";
import type {
  AddMemberInput,
  UpdateMemberRoleInput,
} from "./membership.schema.js";

type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export async function addMemberToOrganization(
  organizationId: string,
  input: AddMemberInput,
) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "No user exists with this email");
  }

  const existingMembership = await findMembership(organizationId, user.id);

  if (existingMembership) {
    throw new AppError(
      409,
      "MEMBER_ALREADY_EXISTS",
      "User is already a member of this organization",
    );
  }

  const membership = await createMembership({
    organizationId,
    userId: user.id,
    role: input.role,
  });

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  };
}

export async function changeMemberRole(
  organizationId: string,
  targetUserId: string,
  actorUserId: string,
  actorRole: MembershipRole,
  input: UpdateMemberRoleInput,
) {
  const targetUser = await findUserById(targetUserId);

  if (!targetUser) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const targetMembership = await findMembership(organizationId, targetUserId);

  if (!targetMembership) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "User is not a member of this organization",
    );
  }

  const newRole = input.role;

  /*
   * Only OWNER can transfer ownership.
   */
  if (newRole === "OWNER" && actorRole !== "OWNER") {
    throw new AppError(
      403,
      "OWNERSHIP_TRANSFER_DENIED",
      "Only the organization owner can transfer ownership",
    );
  }

  /*
   * ADMIN cannot manage OWNER or ADMIN memberships.
   */
  if (
    actorRole === "ADMIN" &&
    (targetMembership.role === "OWNER" || targetMembership.role === "ADMIN")
  ) {
    throw new AppError(
      403,
      "MEMBER_ROLE_CHANGE_DENIED",
      "Admins can only manage members and viewers",
    );
  }

  /*
   * Only OWNER can modify an existing OWNER.
   */
  if (targetMembership.role === "OWNER" && actorRole !== "OWNER") {
    throw new AppError(
      403,
      "OWNER_ROLE_PROTECTED",
      "Only the organization owner can modify the owner",
    );
  }

  /*
   * Prevent the owner from accidentally removing
   * their ownership without transferring it.
   */
  if (
    targetUserId === actorUserId &&
    actorRole === "OWNER" &&
    newRole !== "OWNER"
  ) {
    throw new AppError(
      400,
      "OWNER_CANNOT_DEMOTE_SELF",
      "Transfer ownership before leaving the owner role",
    );
  }

  /*
   * Ownership transfer:
   *
   * target -> OWNER
   * current owner -> ADMIN
   */
  if (newRole === "OWNER") {
    await updateMembershipRole(organizationId, targetUserId, "OWNER");

    await updateMembershipRole(organizationId, actorUserId, "ADMIN");

    await updateOrganizationOwner(organizationId, targetUserId);

    return {
      userId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: "OWNER" as const,
    };
  }

  await updateMembershipRole(organizationId, targetUserId, newRole);

  return {
    userId: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: newRole,
  };
}

export async function removeMemberFromOrganization(
  organizationId: string,
  targetUserId: string,
  actorUserId: string,
  actorRole: MembershipRole,
): Promise<void> {
  const targetMembership = await findMembership(organizationId, targetUserId);

  if (!targetMembership) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "User is not a member of this organization",
    );
  }

  /*
   * Nobody can remove the owner.
   * Ownership must be transferred first.
   */
  if (targetMembership.role === "OWNER") {
    throw new AppError(
      400,
      "OWNER_CANNOT_BE_REMOVED",
      "Transfer ownership before removing the owner",
    );
  }

  /*
   * ADMIN cannot remove another ADMIN.
   */
  if (actorRole === "ADMIN" && targetMembership.role === "ADMIN") {
    throw new AppError(
      403,
      "MEMBER_REMOVAL_DENIED",
      "Admins cannot remove other admins",
    );
  }

  /*
   * Prevent self-removal for now.
   * We can implement "leave organization" separately.
   */
  if (targetUserId === actorUserId) {
    throw new AppError(
      400,
      "CANNOT_REMOVE_SELF",
      "Use the leave organization flow to remove yourself",
    );
  }

  await deleteMembership(organizationId, targetUserId);
}
