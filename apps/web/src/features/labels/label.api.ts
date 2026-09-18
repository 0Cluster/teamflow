import { api } from "../../lib/api.js";

import type {
  CreateLabelInput,
  Label,
  UpdateLabelInput,
} from "./label.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface BackendLabel {
  _id: string;
  organizationId: string;
  name: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeLabel(label: BackendLabel): Label {
  return {
    id: label._id,
    organizationId: label.organizationId,
    name: label.name,
    color: label.color,
    createdBy: label.createdBy,
    createdAt: label.createdAt,
    updatedAt: label.updatedAt,
  };
}

export async function listLabels(
  organizationId: string,
): Promise<Label[]> {
  const response = await api.get<ApiResponse<BackendLabel[]>>(
    `/organizations/${organizationId}/labels`,
  );

  return response.data.data.map(normalizeLabel);
}

export async function createLabel(
  organizationId: string,
  input: CreateLabelInput,
): Promise<Label> {
  const response = await api.post<ApiResponse<BackendLabel>>(
    `/organizations/${organizationId}/labels`,
    input,
  );

  return normalizeLabel(response.data.data);
}

export async function updateLabel(
  organizationId: string,
  labelId: string,
  input: UpdateLabelInput,
): Promise<Label> {
  const response = await api.patch<ApiResponse<BackendLabel>>(
    `/organizations/${organizationId}/labels/${labelId}`,
    input,
  );

  return normalizeLabel(response.data.data);
}

export async function deleteLabel(
  organizationId: string,
  labelId: string,
): Promise<void> {
  await api.delete(
    `/organizations/${organizationId}/labels/${labelId}`,
  );
}
