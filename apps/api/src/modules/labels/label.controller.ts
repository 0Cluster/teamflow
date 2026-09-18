import type { Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../../common/errors/app-error.js";
import { getParam } from "../../common/utils/get-param.js";
import {
  createLabelForOrganization,
  deleteLabelForOrganization,
  listLabelsForOrganization,
  updateLabelForOrganization,
} from "./label.service.js";
import {
  createLabelSchema,
  updateLabelSchema,
} from "./label.schema.js";

export async function createLabel(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  try {
    const organizationId = getParam(
      req,
      "organizationId",
    );

    const input = createLabelSchema.parse(req.body);

    const label =
      await createLabelForOrganization(
        organizationId,
        req.user.id,
        input,
      );

    res.status(201).json({
      success: true,
      data: label,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.issues,
        },
      });
      return;
    }

    throw error;
  }
}

export async function listLabels(
  req: Request,
  res: Response,
): Promise<void> {
  const organizationId = getParam(
    req,
    "organizationId",
  );

  const labels =
    await listLabelsForOrganization(
      organizationId,
    );

  res.status(200).json({
    success: true,
    data: labels,
  });
}

export async function updateLabel(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  try {
    const organizationId = getParam(
      req,
      "organizationId",
    );

    const labelId = getParam(
      req,
      "labelId",
    );

    const input = updateLabelSchema.parse(
      req.body,
    );

    const label =
      await updateLabelForOrganization(
        organizationId,
        labelId,
        req.user.id,
        input,
      );

    res.status(200).json({
      success: true,
      data: label,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.issues,
        },
      });
      return;
    }

    throw error;
  }
}

export async function deleteLabel(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const organizationId = getParam(
    req,
    "organizationId",
  );

  const labelId = getParam(
    req,
    "labelId",
  );

  await deleteLabelForOrganization(
    organizationId,
    labelId,
    req.user.id,
  );

  res.status(204).send();
}
