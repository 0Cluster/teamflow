import { useQuery } from "@tanstack/react-query";

import { listTaskActivity } from "./activity.api.js";
import type { Activity } from "./activity.types.js";

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

  const activities = activityQuery.data ?? [];

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Activity</h2>

        <p className="mt-1 text-sm text-slate-500">
          Recent changes and events for this task.
        </p>
      </div>

      {activityQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading activity...</p>
      )}

      {activityQuery.isError && (
        <p className="text-sm text-red-400">Failed to load activity.</p>
      )}

      {!activityQuery.isLoading &&
        !activityQuery.isError &&
        activities.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">No activity yet.</p>
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
  switch (activity.type) {
    case "TASK_CREATED":
      return "created this task";

    case "TASK_UPDATED":
      return "updated this task";

    case "TASK_DELETED":
      return "deleted this task";

    case "COMMENT_CREATED":
      return "added a comment";

    case "COMMENT_UPDATED":
      return "updated a comment";

    case "COMMENT_DELETED":
      return "deleted a comment";

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
