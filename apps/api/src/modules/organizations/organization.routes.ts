import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  createOrganization,
  getOrganization,
  listOrganizations,
  deleteOrganization,
} from "./organization.controller.js";
import {
  requireOrganizationMember,
  requireOrganizationRole,
} from "./organization.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createOrganization);

router.get("/", listOrganizations);

router.get(
  "/:organizationId",
  requireOrganizationMember,
  getOrganization,
);

router.delete(
  "/:organizationId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER"),
  deleteOrganization,
);

export { router as organizationRouter };
