import { useState } from "react";
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

const VISIBLE_ACTIVITY_LIMIT = 5;

export function ActivityTimeline({
  title,
  description,
  isLoading,
  isError,
  activities,
  emptyText,
}: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleActivities = expanded
    ? activities
    : activities.slice(0, VISIBLE_ACTIVITY_LIMIT);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
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

      {visibleActivities.length > 0 && (
        <div className="relative">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-800" />

          <div className="space-y-6">
            {visibleActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}

      {!isLoading &&
        !isError &&
        activities.length > VISIBLE_ACTIVITY_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-6 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {expanded
              ? "Show less"
              : `Show all ${activities.length} activities`}
          </button>
        )}
    </section>
  );
}

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const displayName =
    activity.actor?.name ?? getMemberName(activity) ?? "Unknown user";

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-slate-700 bg-slate-950" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-white">
            {displayName}
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
  const metadata = activity.metadata as Record<string, unknown>;
  const taskRef =
    activity.task != null
      ? ` (${activity.task.title})`
      : "";

  const memberName = getMemberName(activity);
  const taskName = taskSubject(activity);

  switch (activity.type) {
    case "TASK_CREATED":
      return `created task ${taskName}`;

    case "TASK_UPDATED": {
      const fields = updatedFields(metadata);

      return fields !== null
        ? `updated ${taskName} (${fields})`
        : `updated ${taskName}`;
    }

    case "TASK_STATUS_CHANGED": {
      const from = metaString(metadata, "from");
      const to = metaString(metadata, "to");

      if (from !== null && to !== null) {
        return `moved ${taskName} from ${formatActivityType(from)} to ${formatActivityType(to)}`;
      }

      return `moved ${taskName}${taskRef}`;
    }

    case "TASK_ASSIGNED": {
      const toName = metaString(metadata, "toName");

      return toName !== null
        ? `assigned ${taskName} to ${toName}`
        : `assigned ${taskName}`;
    }

    case "TASK_UNASSIGNED": {
      const fromName = metaString(metadata, "fromName");

      return fromName !== null
        ? `unassigned ${taskName} from ${fromName}`
        : `unassigned ${taskName}`;
    }

    case "TASK_DELETED":
      return `deleted ${taskName}`;

    case "COMMENT_CREATED":
      return `added a comment${taskRef}`;

    case "COMMENT_UPDATED":
      return `updated a comment${taskRef}`;

    case "COMMENT_DELETED":
      return `deleted a comment${taskRef}`;

    case "PROJECT_CREATED": {
      const name = metaString(metadata, "name");

      return name !== null
        ? `created project "${name}"`
        : "created a project";
    }

    case "PROJECT_UPDATED":
      return "updated this project";

    case "PROJECT_DELETED": {
      const name = metaString(metadata, "name");

      return name !== null
        ? `deleted project "${name}"`
        : "deleted a project";
    }

    case "MEMBER_ADDED":
      return memberName !== null
        ? `added ${memberName} to the organization`
        : "added a member";

    case "MEMBER_ROLE_CHANGED":
      return roleChangeMessage(memberName, metadata);

    case "MEMBER_REMOVED": {
      if (metadata.selfLeave === true) {
        return "has left the organization";
      }

      return memberName !== null
        ? `removed ${memberName} from the organization`
        : "removed a member";
    }

    case "OWNERSHIP_TRANSFERRED":
      return memberName !== null
        ? `transferred ownership to ${memberName}`
        : "transferred ownership";

    case "LABEL_CREATED": {
      const name = metaString(metadata, "name");

      return name !== null
        ? `created label "${name}"`
        : "created a label";
    }

    case "LABEL_UPDATED": {
      const name = metaString(metadata, "name");

      return name !== null
        ? `updated label "${name}"`
        : "updated a label";
    }

    case "LABEL_DELETED": {
      const name = metaString(metadata, "name");

      return name !== null
        ? `deleted label "${name}"`
        : "deleted a label";
    }

    default:
      return formatActivityType(activity.type);
  }
}

function metaString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.length > 0
    ? value
    : null;
}

/*
 * "Fix bug" (API-7) when refs are populated, otherwise the
 * denormalized title from metadata, otherwise a generic noun.
 */
function taskSubject(activity: Activity): string {
  if (activity.task != null) {
    const identifier =
      activity.project != null
        ? `${activity.project.key}-${activity.task.number}`
        : `#${activity.task.number}`;

    return `"${activity.task.title}" (${identifier})`;
  }

  const metadata = activity.metadata as Record<string, unknown>;
  const title = metaString(metadata, "title");

  if (title !== null) {
    return `"${title}"`;
  }

  return "this task";
}

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  assigneeId: "assignee",
  dueDate: "due date",
  labelIds: "labels",
};

function updatedFields(
  metadata: Record<string, unknown>,
): string | null {
  const fields = metadata.fields;

  if (!Array.isArray(fields) || fields.length === 0) {
    return null;
  }

  const labels = fields.map((field) =>
    typeof field === "string" && field in FIELD_LABELS
      ? FIELD_LABELS[field]
      : typeof field === "string"
        ? field
        : "field",
  );

  return [...new Set(labels)].join(", ");
}

const ROLE_RANK: Record<string, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

function roleChangeMessage(
  memberName: string | null,
  metadata: Record<string, unknown>,
): string {
  const previousRole = metaString(metadata, "previousRole");
  const role = metaString(metadata, "role");
  const who = memberName ?? "a member";

  if (
    previousRole !== null &&
    role !== null &&
    previousRole in ROLE_RANK &&
    role in ROLE_RANK &&
    ROLE_RANK[previousRole] !== ROLE_RANK[role]
  ) {
    const verb =
      (ROLE_RANK[role] as number) > (ROLE_RANK[previousRole] as number)
        ? "promoted"
        : "demoted";

    return `${verb} ${who} to ${role}`;
  }

  return memberName !== null
    ? `changed ${memberName}'s role`
    : "changed a member's role";
}

function getMemberName(activity: Activity): string | null {
  const metadata = activity.metadata as {
    memberName?: unknown;
  };

  return typeof metadata.memberName === "string" &&
    metadata.memberName.length > 0
    ? metadata.memberName
    : null;
}

function formatActivityType(type: string): string {
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
