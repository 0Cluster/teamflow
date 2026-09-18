import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
  requireOrganizationRole,
} from "../organizations/organization.middleware.js";
import {
  createTask,
  deleteTask,
  getTask,
  listMyTasks,
  listTasks,
  updateTask,
} from "./task.controller.js";

const router = Router();

router.use(authenticate);

router.get("/tasks", listMyTasks);

router.post(
  "/organizations/:organizationId/projects/:projectId/tasks",
  requireOrganizationMember,
  createTask,
);

router.get(
  "/organizations/:organizationId/projects/:projectId/tasks",
  requireOrganizationMember,
  listTasks,
);

router.get(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId",
  requireOrganizationMember,
  getTask,
);

router.patch(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId",
  requireOrganizationMember,
  updateTask,
);

router.delete(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  deleteTask,
);

export { router as taskRouter };
