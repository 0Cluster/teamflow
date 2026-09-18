import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
} from "../organizations/organization.middleware.js";
import {
  addTaskLabel,
  removeTaskLabel,
} from "./task-label.controller.js";

export const taskLabelRouter = Router();

taskLabelRouter.use(authenticate);

taskLabelRouter.post(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/labels/:labelId",
  requireOrganizationMember,
  addTaskLabel,
);

taskLabelRouter.delete(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/labels/:labelId",
  requireOrganizationMember,
  removeTaskLabel,
);
