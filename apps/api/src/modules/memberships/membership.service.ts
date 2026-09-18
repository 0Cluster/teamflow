import { AppError } from "../../common/errors/app-error.js";
import { findUserByEmail, findUserById } from "../users/user.repository.js";
import {
  notifyMemberAdded,
  notifyMemberRoleChanged,
  notifyOwnershipTransferred,
} from "../notifications/notification.service.js";
import {
  emitMemberAdded,
  emitMemberRemoved,
  emitMemberUpdated,
} from "../../socket/socket.events.js";
import { logActivity } from "../activity/activity.service.js";
import {
  createMembership,
  deleteMembership,
  findMembership,
  updateMembershipRole,
} from "./membership.repository.js";
import { updateOrganizationOwner } from "../organizations/organization.repository.js";
import { findOrganizationById } from "../organizations/organization.repository.js";
import type {
  AddMemberInput,
  UpdateMemberRoleInput,
} from "./membership.schema.js";

type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export async function addMemberToOrganization(
  organizationId: string,
  input: AddMemberInput,
  actorId: string,
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

  const member = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  };

  const organization = await findOrganizationById(organizationId);

  await notifyMemberAdded({
    userId: user.id,
    organizationId,
    orgName: organization?.name ?? "your organization",
    actorId,
  });

  await logActivity({
    organizationId,
    actorId,
    type: "MEMBER_ADDED",
    metadata: {
      userId: user.id,
      memberName: user.name,
      role: membership.role,
    },
  });

  emitMemberAdded(organizationId, member);

  return member;
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

    const member = {
      userId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: "OWNER" as const,
    };

    const organization = await findOrganizationById(organizationId);

    await notifyOwnershipTransferred({
      userId: targetUserId,
      organizationId,
      orgName: organization?.name ?? "your organization",
      actorId: actorUserId,
    });

    await logActivity({
      organizationId,
      actorId: actorUserId,
      type: "OWNERSHIP_TRANSFERRED",
      metadata: {
        userId: targetUserId,
        memberName: targetUser.name,
      },
    });

    emitMemberUpdated(organizationId, member);

    return member;
  }

  await updateMembershipRole(organizationId, targetUserId, newRole);

  const member = {
    userId: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: newRole,
  };

  const organization = await findOrganizationById(organizationId);

  await notifyMemberRoleChanged({
    userId: targetUserId,
    organizationId,
    orgName: organization?.name ?? "your organization",
    actorId: actorUserId,
    role: newRole,
  });

  await logActivity({
    organizationId,
    actorId: actorUserId,
    type: "MEMBER_ROLE_CHANGED",
    metadata: {
      userId: targetUserId,
      memberName: targetUser.name,
      role: newRole,
    },
  });

  emitMemberUpdated(organizationId, member);

  return member;
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

  const targetUser = await findUserById(targetUserId);

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
   * Self-removal goes through the leave flow instead,
   * so accidental clicks can't lock anyone out.
   */
  if (targetUserId === actorUserId) {
    throw new AppError(
      400,
      "CANNOT_REMOVE_SELF",
      "Use the leave organization flow to remove yourself",
    );
  }

  await deleteMembership(organizationId, targetUserId);

  await logActivity({
    organizationId,
    actorId: actorUserId,
    type: "MEMBER_REMOVED",
    metadata: {
      userId: targetUserId,
      ...(targetUser?.name !== undefined
        ? { memberName: targetUser.name }
        : {}),
    },
  });

  emitMemberRemoved(organizationId, {
    userId: targetUserId,
  });
}

export async function leaveOrganizationForUser(
  organizationId: string,
  userId: string,
): Promise<void> {
  const membership = await findMembership(organizationId, userId);

  if (!membership) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "You are not a member of this organization",
    );
  }

  /*
   * The owner cannot leave.
   * Ownership must be transferred first.
   */
  if (membership.role === "OWNER") {
    throw new AppError(
      400,
      "OWNER_CANNOT_LEAVE",
      "Transfer ownership before leaving the organization",
    );
  }

  await deleteMembership(organizationId, userId);

  const leaver = await findUserById(userId);

  await logActivity({
    organizationId,
    actorId: userId,
    type: "MEMBER_REMOVED",
    metadata: {
      userId,
      ...(leaver?.name !== undefined
        ? { memberName: leaver.name }
        : {}),
      selfLeave: true,
    },
  });

  emitMemberRemoved(organizationId, {
    userId,
  });
}
