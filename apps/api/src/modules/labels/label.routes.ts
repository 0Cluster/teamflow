import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
  requireOrganizationRole,
} from "../organizations/organization.middleware.js";
import {
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
} from "./label.controller.js";

export const labelRouter = Router();

labelRouter.use(authenticate);

labelRouter.post(
  "/organizations/:organizationId/labels",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  createLabel,
);

labelRouter.get(
  "/organizations/:organizationId/labels",
  requireOrganizationMember,
  listLabels,
);

labelRouter.patch(
  "/organizations/:organizationId/labels/:labelId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  updateLabel,
);

labelRouter.delete(
  "/organizations/:organizationId/labels/:labelId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  deleteLabel,
);
