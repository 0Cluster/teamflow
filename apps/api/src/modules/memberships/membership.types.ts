export type MembershipRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "VIEWER";

export interface IMembership {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
}
