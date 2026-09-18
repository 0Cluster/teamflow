import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
} from "../organizations/organization.middleware.js";
import {
  listOrganizationActivity,
  listProjectActivity,
  listTaskActivity,
} from "./activity.controller.js";

export const activityRouter = Router();

activityRouter.use(authenticate);

activityRouter.get(
  "/organizations/:organizationId/activity",
  requireOrganizationMember,
  listOrganizationActivity,
);

activityRouter.get(
  "/organizations/:organizationId/projects/:projectId/activity",
  requireOrganizationMember,
  listProjectActivity,
);

activityRouter.get(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/activity",
  requireOrganizationMember,
  listTaskActivity,
);
