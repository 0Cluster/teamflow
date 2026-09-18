import { useQuery } from "@tanstack/react-query";

import { listTaskActivity } from "./activity.api.js";
import type { Activity } from "./activity.types.js";
import { useLiveActivity } from "../../hooks/use-live-activity.js";

interface ActivityFeedProps {
  organizationId: string;
  projectId: string;
  taskId: string;
}

export function ActivityFeed({
  organizationId,
  projectId,
  taskId,
}: ActivityFeedProps) {
  const activityQuery = useQuery({
    queryKey: ["task-activity", organizationId, projectId, taskId],
    queryFn: () => listTaskActivity(organizationId, projectId, taskId),
  });

  useLiveActivity(organizationId, [
    "task-activity",
    organizationId,
    projectId,
    taskId,
  ]);

  return (
    <ActivityTimeline
      title="Activity"
      description="Recent changes and events for this task."
      isLoading={activityQuery.isLoading}
      isError={activityQuery.isError}
      activities={activityQuery.data ?? []}
      emptyText="No activity yet."
    />
  );
}

interface ActivityTimelineProps {
  title: string;
  description: string;
  isLoading: boolean;
  isError: boolean;
  activities: Activity[];
  emptyText: string;
}

export function ActivityTimeline({
  title,
  description,
  isLoading,
  isError,
  activities,
  emptyText,
}: ActivityTimelineProps) {
  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">Loading activity...</p>
      )}

      {isError && (
        <p className="text-sm text-red-400">Failed to load activity.</p>
      )}

      {!isLoading &&
        !isError &&
        activities.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">{emptyText}</p>
          </div>
        )}

      {activities.length > 0 && (
        <div className="relative">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-800" />

          <div className="space-y-6">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-slate-700 bg-slate-950" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-white">
            {activity.actor?.name ?? "Unknown user"}
          </span>

          <span className="text-sm text-slate-400">
            {getActivityMessage(activity)}
          </span>
        </div>

        <time
          dateTime={activity.createdAt}
          className="mt-1 block text-xs text-slate-600"
        >
          {formatActivityDate(activity.createdAt)}
        </time>
      </div>
    </div>
  );
}

function getActivityMessage(activity: Activity): string {
  const taskRef =
    activity.task != null
      ? ` (${activity.task.title})`
      : "";

  switch (activity.type) {
    case "TASK_CREATED":
      return "created this task";

    case "TASK_UPDATED":
      return "updated this task";

    case "TASK_STATUS_CHANGED":
      return `moved this task${taskRef}`;

    case "TASK_ASSIGNED":
      return "assigned this task";

    case "TASK_UNASSIGNED":
      return "unassigned this task";

    case "TASK_DELETED":
      return "deleted this task";

    case "COMMENT_CREATED":
      return "added a comment";

    case "COMMENT_UPDATED":
      return "updated a comment";

    case "COMMENT_DELETED":
      return "deleted a comment";

    case "PROJECT_CREATED":
      return "created a project";

    case "PROJECT_UPDATED":
      return "updated a project";

    case "PROJECT_DELETED":
      return "deleted a project";

    case "MEMBER_ADDED":
      return "added a member";

    case "MEMBER_ROLE_CHANGED":
      return "changed a member's role";

    case "MEMBER_REMOVED":
      return "removed a member";

    case "OWNERSHIP_TRANSFERRED":
      return "transferred ownership";

    case "LABEL_CREATED":
      return "created a label";

    case "LABEL_UPDATED":
      return "updated a label";

    case "LABEL_DELETED":
      return "deleted a label";

    default:
      return formatActivityType(activity.type);
  }
}

function formatActivityType(type: Activity["type"]): string {
  return type
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatActivityDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
