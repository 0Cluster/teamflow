import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import {
  addMemberSchema,
  updateMemberRoleSchema,
} from "./membership.schema.js";
import {
  addMemberToOrganization,
  changeMemberRole,
  removeMemberFromOrganization,
} from "./membership.service.js";
import {
  findMembershipsByOrganization,
} from "./membership.repository.js";

export async function listMembers(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId =
    req.params.organizationId;

  if (typeof organizationId !== "string") {
    throw new AppError(
      400,
      "INVALID_ORGANIZATION_ID",
      "Organization ID must be a string",
    );
  }

  const memberships =
    await findMembershipsByOrganization(
      organizationId,
    );

  const members = memberships.map((membership) => {
    const user = membership.userId as unknown as {
      _id: string;
      name: string;
      email: string;
    };

    return {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: membership.role,
      joinedAt: membership.createdAt,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      members,
    },
  });
}

export async function addMember(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user || !req.organizationMembership) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const organizationId =
    req.params.organizationId;

  if (typeof organizationId !== "string") {
    throw new AppError(
      400,
      "INVALID_ORGANIZATION_ID",
      "Organization ID must be a string",
    );
  }

  const result = addMemberSchema.safeParse(
    req.body,
  );

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const member = await addMemberToOrganization(
    organizationId,
    result.data,
  );

  res.status(201).json({
    success: true,
    data: {
      member,
    },
  });
}

export async function updateMemberRole(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user || !req.organizationMembership) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const organizationId =
    req.params.organizationId;

  const targetUserId =
    req.params.userId;

  if (
    typeof organizationId !== "string" ||
    typeof targetUserId !== "string"
  ) {
    throw new AppError(
      400,
      "INVALID_MEMBER_PARAMS",
      "Invalid organization or user ID",
    );
  }

  const result =
    updateMemberRoleSchema.safeParse(
      req.body,
    );

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: result.error.flatten(),
      },
    });

    return;
  }

  const member = await changeMemberRole(
    organizationId,
    targetUserId,
    req.user.id,
    req.organizationMembership.role,
    result.data,
  );

  res.status(200).json({
    success: true,
    data: {
      member,
    },
  });
}

export async function removeMember(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user || !req.organizationMembership) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const organizationId =
    req.params.organizationId;

  const targetUserId =
    req.params.userId;

  if (
    typeof organizationId !== "string" ||
    typeof targetUserId !== "string"
  ) {
    throw new AppError(
      400,
      "INVALID_MEMBER_PARAMS",
      "Invalid organization or user ID",
    );
  }

  await removeMemberFromOrganization(
    organizationId,
    targetUserId,
    req.user.id,
    req.organizationMembership.role,
  );

  res.status(200).json({
    success: true,
    data: {
      message: "Member removed successfully",
    },
  });
}
