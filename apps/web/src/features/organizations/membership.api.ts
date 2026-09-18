import { api } from "../../lib/api.js";
import type {
  AddMemberInput,
  OrganizationMember,
  UpdateMemberRoleInput,
} from "./membership.types.js";

import type { ApiResponse } from "@teamflow/shared";

interface MembersPayload {
  members: OrganizationMember[];
}

interface MemberPayload {
  member: OrganizationMember;
}

interface MessagePayload {
  message: string;
}

export async function listMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const response = await api.get<
    ApiResponse<MembersPayload>
  >(`/organizations/${organizationId}/members`);

  return response.data.data.members;
}

export async function addMember(
  organizationId: string,
  input: AddMemberInput,
): Promise<OrganizationMember> {
  const response = await api.post<
    ApiResponse<MemberPayload>
  >(`/organizations/${organizationId}/members`, input);

  return response.data.data.member;
}

export async function updateMemberRole(
  organizationId: string,
  userId: string,
  input: UpdateMemberRoleInput,
): Promise<OrganizationMember> {
  const response = await api.patch<
    ApiResponse<MemberPayload>
  >(
    `/organizations/${organizationId}/members/${userId}`,
    input,
  );

  return response.data.data.member;
}

export async function removeMember(
  organizationId: string,
  userId: string,
): Promise<string> {
  const response = await api.delete<
    ApiResponse<MessagePayload>
  >(
    `/organizations/${organizationId}/members/${userId}`,
  );

  return response.data.data.message;
}

export async function leaveOrganization(
  organizationId: string,
): Promise<string> {
  const response = await api.post<
    ApiResponse<MessagePayload>
  >(`/organizations/${organizationId}/leave`);

  return response.data.data.message;
}
