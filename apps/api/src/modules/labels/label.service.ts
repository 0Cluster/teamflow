import { AppError } from "../../common/errors/app-error.js";
import { logActivity } from "../activity/activity.service.js";
import {
  createLabel,
  deleteLabel,
  findLabelById,
  findLabelsByOrganization,
  updateLabel,
} from "./label.repository.js";
import type { CreateLabelInput, UpdateLabelInput } from "./label.schema.js";

export async function createLabelForOrganization(
  organizationId: string,
  userId: string,
  input: CreateLabelInput,
) {
  try {
    const label = await createLabel({
      organizationId,
      createdBy: userId,
      name: input.name,
      color: input.color,
    });

    await logActivity({
      organizationId,
      actorId: userId,
      type: "LABEL_CREATED",
      metadata: {
        labelId: label.id,
        name: label.name,
      },
    });

    return label;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "MongoServerError" &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(
        409,
        "LABEL_ALREADY_EXISTS",
        "A label with this name already exists",
      );
    }

    throw error;
  }
}

export async function listLabelsForOrganization(organizationId: string) {
  return findLabelsByOrganization(organizationId);
}

export async function updateLabelForOrganization(
  organizationId: string,
  labelId: string,
  userId: string,
  input: UpdateLabelInput,
) {
  const label = await findLabelById(organizationId, labelId);

  if (!label) {
    throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
  }

  const updateData = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
  };

  const updatedLabel = await updateLabel(organizationId, labelId, updateData);

  if (!updatedLabel) {
    throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
  }

  await logActivity({
    organizationId,
    actorId: userId,
    type: "LABEL_UPDATED",
    metadata: {
      labelId,
      name: updatedLabel.name,
    },
  });

  return updatedLabel;
}

export async function deleteLabelForOrganization(
  organizationId: string,
  labelId: string,
  userId: string,
) {
  const label = await findLabelById(organizationId, labelId);

  if (!label) {
    throw new AppError(404, "LABEL_NOT_FOUND", "Label not found");
  }

  await deleteLabel(organizationId, labelId);

  await logActivity({
    organizationId,
    actorId: userId,
    type: "LABEL_DELETED",
    metadata: {
      labelId,
      name: label.name,
    },
  });
}
