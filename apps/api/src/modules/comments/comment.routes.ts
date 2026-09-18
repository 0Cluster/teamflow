import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  requireOrganizationMember,
} from "../organizations/organization.middleware.js";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "./comment.controller.js";

export const commentRouter = Router();

commentRouter.use(authenticate);

commentRouter.post(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments",
  requireOrganizationMember,
  createComment,
);

commentRouter.get(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments",
  requireOrganizationMember,
  listComments,
);

commentRouter.patch(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireOrganizationMember,
  updateComment,
);

commentRouter.delete(
  "/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireOrganizationMember,
  deleteComment,
);
