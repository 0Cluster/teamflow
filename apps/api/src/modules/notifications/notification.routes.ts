import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/notifications",
  listNotifications,
);

router.patch(
  "/notifications/:notificationId/read",
  markNotificationAsRead,
);

router.patch(
  "/notifications/read-all",
  markAllNotificationsAsRead,
);

export { router as notificationRouter };
