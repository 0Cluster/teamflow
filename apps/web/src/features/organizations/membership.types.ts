export type MembershipRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";

export interface OrganizationMember {
  userId: string;
  name: string;
  email: string;
  role: MembershipRole;
  joinedAt: string;
}

export interface AddMemberInput {
  email: string;
  role: MembershipRole;
}

export interface UpdateMemberRoleInput {
  role: MembershipRole;
}
