import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  createOrganization,
  getOrganization,
  listOrganizations,
} from "./organization.controller.js";
import {
  requireOrganizationMember,
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

export { router as organizationRouter };
