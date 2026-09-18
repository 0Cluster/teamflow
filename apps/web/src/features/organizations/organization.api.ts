import { api } from "../../lib/api.js";
import type {
  CreateOrganizationInput,
  Organization,
  OrganizationResponse,
  OrganizationsResponse,
} from "./organization.types.js";

import type { ApiResponse } from "@teamflow/shared";

export async function listOrganizations(): Promise<Organization[]> {
  const response = await api.get<ApiResponse<OrganizationsResponse>>(
    "/organizations",
  );

  return response.data.data.organizations;
}

export async function getOrganization(
  organizationId: string,
): Promise<Organization> {
  const response = await api.get<ApiResponse<OrganizationResponse>>(
    `/organizations/${organizationId}`,
  );

  return response.data.data.organization;
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<Organization> {
  const response = await api.post<ApiResponse<OrganizationResponse>>(
    "/organizations",
    input,
  );

  return response.data.data.organization;
}

export async function deleteOrganization(
  organizationId: string,
): Promise<string> {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/organizations/${organizationId}`,
  );

  return response.data.data.message;
}
