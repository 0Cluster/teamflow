import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import { findMembership } from "../memberships/membership.repository.js";

export async function requireOrganizationMember(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

const organizationId = req.params.organizationId;

if (typeof organizationId !== "string") {
  throw new AppError(
    400,
    "INVALID_ORGANIZATION_ID",
    "Organization ID must be a string",
  );
}

  if (!organizationId) {
    throw new AppError(
      400,
      "ORGANIZATION_ID_REQUIRED",
      "Organization ID is required",
    );
  }

  const membership = await findMembership(organizationId, req.user.id);

  if (!membership) {
    throw new AppError(
      403,
      "ORGANIZATION_ACCESS_DENIED",
      "You are not a member of this organization",
    );
  }

  req.organizationMembership = {
    organizationId,
    userId: req.user.id,
    role: membership.role,
  };

  next();
}
import type { MembershipRole } from "../memberships/membership.types.js";

export function requireOrganizationRole(...allowedRoles: MembershipRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.organizationMembership) {
      throw new AppError(
        403,
        "ORGANIZATION_ACCESS_DENIED",
        "Organization membership is required",
      );
    }

    if (!allowedRoles.includes(req.organizationMembership.role)) {
      throw new AppError(
        403,
        "ORGANIZATION_PERMISSION_DENIED",
        "You do not have permission to perform this action",
      );
    }

    next();
  };
}
