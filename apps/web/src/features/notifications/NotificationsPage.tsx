import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.api.js";

import type {
  Notification,
  NotificationsResponse,
} from "./notification.types.js";
import { useToast } from "../../components/ui/Toast.js";
import {
  EmptyState,
  ErrorState,
  SkeletonRow,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

function formatNotificationDate(date: string): string {
  const value = new Date(date);

  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getNotificationIcon(type: Notification["type"]): string {
  switch (type) {
    case "TASK_ASSIGNED":
      return "✓";

    case "TASK_STATUS_CHANGED":
      return "↻";

    case "COMMENT_CREATED":
      return "💬";

    case "MEMBER_ADDED":
      return "+";

    case "MEMBER_ROLE_CHANGED":
      return "⇄";

    case "OWNERSHIP_TRANSFERRED":
      return "★";

    default:
      return "•";
  }
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      listNotifications({
        page: 1,
        limit: 50,
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,

    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({
        queryKey: ["notifications"],
      });

      const previous =
        queryClient.getQueryData<NotificationsResponse>([
          "notifications",
        ]);

      if (previous) {
        queryClient.setQueryData<NotificationsResponse>(
          ["notifications"],
          {
            ...previous,
            unreadCount: Math.max(0, previous.unreadCount - 1),
            notifications: previous.notifications.map((notification) =>
              notification.id === notificationId
                ? { ...notification, isRead: true }
                : notification,
            ),
          },
        );
      }

      return { previous };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }

      toast.error(getErrorMessage(error, "Failed to update notification."));
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,

    onSuccess: () => {
      toast.success("All caught up.");

      void queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update notifications."));
    },
  });

  const notifications = notificationsQuery.data?.notifications ?? [];

  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;

  function handleMarkRead(notificationId: string) {
    if (markReadMutation.isPending) {
      return;
    }

    markReadMutation.mutate(notificationId);
  }

  if (notificationsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-800" />

        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <ErrorState
          title="Failed to load notifications."
          actionLabel="Retry"
          onAction={() => void notificationsQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>

          <p className="mt-1 text-sm text-slate-500">
            Stay updated on tasks, comments, and project activity.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markAllReadMutation.isPending ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Unread notifications</span>

          <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        </div>
      </div>

      {/* Empty */}
      {notifications.length === 0 && (
        <EmptyState
          title="You're all caught up."
          hint="New notifications will appear here."
        />
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {notifications.map((notification) => {
            const taskUrl =
              notification.organizationId &&
              notification.projectId &&
              notification.taskId
                ? `/organizations/${notification.organizationId}/projects/${notification.projectId}/tasks/${notification.taskId}`
                : null;

            return (
              <div
                key={notification.id}
                className={[
                  "border-b border-slate-800 p-5 transition last:border-b-0",
                  notification.isRead ? "bg-slate-900" : "bg-indigo-950/20",
                ].join(" ")}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      notification.isRead
                        ? "bg-slate-800 text-slate-400"
                        : "bg-indigo-600 text-white",
                    ].join(" ")}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-white">
                            {notification.title}
                          </h2>

                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {notification.message}
                        </p>
                      </div>

                      <span className="shrink-0 text-xs text-slate-600">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </div>

                    {/* Actor */}
                    {notification.actor && (
                      <p className="mt-2 text-xs text-slate-500">
                        From{" "}
                        <span className="font-medium text-slate-400">
                          {notification.actor.name}
                        </span>
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {taskUrl && (
                        <Link
                          to={taskUrl}
                          onClick={() => {
                            if (!notification.isRead) {
                              handleMarkRead(notification.id);
                            }
                          }}
                          className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
                        >
                          View task →
                        </Link>
                      )}

                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notification.id)}
                          disabled={markReadMutation.isPending}
                          className="text-xs font-medium text-slate-500 transition hover:text-white disabled:opacity-50"
                        >
                          Mark as read
                        </button>
                      )}

                      {notification.isRead && (
                        <span className="text-xs text-slate-600">Read</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
