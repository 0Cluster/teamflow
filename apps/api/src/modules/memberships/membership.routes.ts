import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
  requireOrganizationRole,
} from "../organizations/organization.middleware.js";
import {
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  leaveOrganization,
} from "./membership.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/organizations/:organizationId/members",
  requireOrganizationMember,
  listMembers,
);

router.post(
  "/organizations/:organizationId/leave",
  requireOrganizationMember,
  leaveOrganization,
);

router.post(
  "/organizations/:organizationId/members",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  addMember,
);

router.patch(
  "/organizations/:organizationId/members/:userId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  updateMemberRole,
);

router.delete(
  "/organizations/:organizationId/members/:userId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  removeMember,
);

export { router as membershipRouter };
