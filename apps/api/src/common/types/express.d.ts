export {};

import type { MembershipRole } from "../../modules/memberships/membership.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
      };

      organizationMembership?: {
        organizationId: string;
        userId: string;
        role: MembershipRole;
      };
    }
  }
}
