import cors from "cors";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { openApiSpec } from "./docs/openapi.js";

import { notificationRouter } from "./modules/notifications/notification.routes.js";
import { commentRouter } from "./modules/comments/comment.routes.js";
import { taskLabelRouter } from "./modules/tasks/task-label.routes.js";
import { labelRouter } from "./modules/labels/label.routes.js";
import { activityRouter } from "./modules/activity/activity.routes.js";
import { organizationRouter } from "./modules/organizations/organization.routes.js";
import { taskRouter } from "./modules/tasks/task.routes.js";
import { projectRouter } from "./modules/projects/project.routes.js";
import { membershipRouter } from "./modules/memberships/membership.routes.js";
import { errorMiddleware } from "./common/middleware/error.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { env } from "./config/env.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/docs.json", (_req, res) => {
  res.status(200).json(openApiSpec);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: "TeamFlow API docs",
  }),
);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1", taskLabelRouter);
app.use("/api/v1", labelRouter);
app.use("/api/v1", activityRouter);
app.use("/api/v1", commentRouter);
app.use("/api/v1", taskRouter);
app.use("/api/v1/organizations", organizationRouter);
app.use("/api/v1", membershipRouter);
app.use("/api/v1", projectRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
    },
  });
});

app.use(errorMiddleware);

export { app };
