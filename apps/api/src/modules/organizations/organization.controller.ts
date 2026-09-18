import type { Request, Response } from "express";

import { AppError } from "../../common/errors/app-error.js";
import { createOrganizationSchema } from "./organization.schema.js";
import {
  createOrganizationForUser,
  getOrganizationsForUser,
} from "./organization.service.js";
import { getOrganizationById } from "./organization.service.js";
export async function createOrganization(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const result = createOrganizationSchema.safeParse(req.body);

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

  const organization = await createOrganizationForUser(
    req.user.id,
    result.data,
  );

  res.status(201).json({
    success: true,
    data: {
      organization,
    },
  });
}

export async function listOrganizations(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const organizations = await getOrganizationsForUser(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      organizations,
    },
  });
}

export async function getOrganization(
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

const organization =
  await getOrganizationById(
    organizationId,
  );

  res.status(200).json({
    success: true,
    data: {
      organization,
    },
  });
}
