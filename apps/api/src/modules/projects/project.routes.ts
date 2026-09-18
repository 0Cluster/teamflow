import { Router } from "express";

import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
  requireOrganizationRole,
} from "../organizations/organization.middleware.js";
import {
  createProject,
  deleteProject,
  getProject,
  listMyProjects,
  listProjects,
  updateProject,
} from "./project.controller.js";

const router = Router();

router.use(authenticate);

router.get("/projects", listMyProjects);

router.post(
  "/organizations/:organizationId/projects",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  createProject,
);

router.get(
  "/organizations/:organizationId/projects",
  requireOrganizationMember,
  listProjects,
);

router.get(
  "/organizations/:organizationId/projects/:projectId",
  requireOrganizationMember,
  getProject,
);

router.patch(
  "/organizations/:organizationId/projects/:projectId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER", "ADMIN"),
  updateProject,
);

router.delete(
  "/organizations/:organizationId/projects/:projectId",
  requireOrganizationMember,
  requireOrganizationRole("OWNER"),
  deleteProject,
);

export { router as projectRouter };
