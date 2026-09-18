import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../../common/errors/app-error.js";
import { getParam } from "../../common/utils/get-param.js";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service.js";
import { notificationQuerySchema } from "./notification.schema.js";

export async function listNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      );
    }

    const query = notificationQuerySchema.parse(req.query);

    const result = await getNotificationsForUser(
      req.user.id,
      query.page,
      query.limit,
      query.unreadOnly,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.issues,
        },
      });
      return;
    }

    throw error;
  }
}

export async function markNotificationAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const notificationId = getParam(
    req,
    "notificationId",
  );

  const notification = await markNotificationRead(
    req.user.id,
    notificationId,
  );

  if (!notification) {
    throw new AppError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification not found",
    );
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
}

export async function markAllNotificationsAsRead(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    throw new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required",
    );
  }

  const result = await markAllNotificationsRead(
    req.user.id,
  );

  res.status(200).json({
    success: true,
    data: {
      modifiedCount: result.modifiedCount,
    },
  });
}
