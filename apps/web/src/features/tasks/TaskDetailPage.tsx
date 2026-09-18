import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ActivityFeed } from "../activity/ActivityFeed.js";
import { CommentsSection } from "../comments/CommentsSection.js";
import { listLabels } from "../labels/label.api.js";
import { listMembers } from "../organizations/membership.api.js";

import { deleteTask, getTask, updateTask } from "./task.api.js";
import { useLiveTasks } from "../../hooks/use-live-tasks.js";
import { useToast } from "../../components/ui/Toast.js";
import { useConfirm } from "../../components/ui/ConfirmDialog.js";
import {
  ErrorState,
  SkeletonCard,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

import type {
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "./task.types.js";
import type { Label } from "../labels/label.types.js";
import type { OrganizationMember } from "../organizations/membership.types.js";

const statuses: {
  value: TaskStatus;
  label: string;
}[] = [
  {
    value: "TODO",
    label: "To Do",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
  },
  {
    value: "IN_REVIEW",
    label: "In Review",
  },
  {
    value: "DONE",
    label: "Done",
  },
];

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskDetailPage() {
  const { organizationId, projectId, taskId } = useParams<{
    organizationId: string;
    projectId: string;
    taskId: string;
  }>();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  useLiveTasks({
    organizationId,
    projectId,
    taskId,
    onTaskDeleted: () => {
      void navigate(
        `/organizations/${organizationId}/projects/${projectId}/tasks`,
      );
    },
  });

  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [status, setStatus] = useState<TaskStatus>("TODO");

  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");

  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  const [dueDate, setDueDate] = useState("");

  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  const taskQuery = useQuery({
    queryKey: ["task", organizationId, projectId, taskId],
    queryFn: () => getTask(organizationId!, projectId!, taskId!),
    enabled: Boolean(organizationId && projectId && taskId),
  });

  const labelsQuery = useQuery({
    queryKey: ["organization-labels", organizationId],
    queryFn: () => listLabels(organizationId!),
    enabled: Boolean(organizationId),
  });

  const membersQuery = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => listMembers(organizationId!),
    enabled: Boolean(organizationId),
  });

  const task = taskQuery.data;
  const labels = labelsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  /*
   * Copy server task data into the edit form
   * only when the user explicitly enters edit mode.
   *
   * This avoids setState inside useEffect.
   */
  function startEditing() {
    if (!task) {
      return;
    }

    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);

    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");

    setSelectedLabelIds(task.labelIds ?? []);

    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);

    if (!task) {
      return;
    }

    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId);

    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");

    setSelectedLabelIds(task.labelIds ?? []);
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTaskInput) =>
      updateTask(organizationId!, projectId!, taskId!, input),

    onSuccess: (updatedTask) => {
      queryClient.setQueryData(
        ["task", organizationId, projectId, taskId],
        updatedTask,
      );

      void queryClient.invalidateQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });

      setIsEditing(false);
      toast.success("Task updated.");
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update task."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(organizationId!, projectId!, taskId!),

    onSuccess: () => {
      toast.success("Task deleted.");

      void queryClient.invalidateQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });

      void navigate(
        `/organizations/${organizationId}/projects/${projectId}/tasks`,
      );
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete task."));
    },
  });

  function statusPillClasses(status: TaskStatus): string {
  switch (status) {
    case "TODO":
      return "bg-slate-500/15 text-slate-300";

    case "IN_PROGRESS":
      return "bg-indigo-500/15 text-indigo-300";

    case "IN_REVIEW":
      return "bg-amber-500/15 text-amber-300";

    case "DONE":
      return "bg-emerald-500/15 text-emerald-300";
  }
}

function priorityPillClasses(priority: TaskPriority): string {
  switch (priority) {
    case "LOW":
      return "bg-slate-500/15 text-slate-300";

    case "MEDIUM":
      return "bg-sky-500/15 text-sky-300";

    case "HIGH":
      return "bg-orange-500/15 text-orange-300";

    case "URGENT":
      return "bg-red-500/15 text-red-300";
  }
}

function isOverdue(
  dueDate: string | null,
  status: TaskStatus,
): boolean {
  if (!dueDate || status === "DONE") {
    return false;
  }

  // eslint-disable-next-line react-hooks/purity -- relative display needs "now"
  return new Date(dueDate).getTime() < Date.now();
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "No due date";
  }

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const diffDays = Math.ceil(
    // eslint-disable-next-line react-hooks/purity -- relative display needs "now"
    (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  const formatted = date.toLocaleDateString();

  if (diffDays < 0) {
    const days = Math.abs(diffDays);

    return `${formatted} (${days} day${days === 1 ? "" : "s"} overdue)`;
  }

  if (diffDays === 0) {
    return `${formatted} (due today)`;
  }

  return `${formatted} (in ${diffDays} day${diffDays === 1 ? "" : "s"})`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

interface TaskDetailsStripProps {
  statusLabel: string | undefined;
  task: Task;
  assignee: OrganizationMember | undefined;
  taskLabels: Label[];
}

function renderTaskDetailsStrip({
  statusLabel,
  task,
  assignee,
  taskLabels,
}: TaskDetailsStripProps) {
  return (
    <div className="mb-5 rounded-xl border border-slate-800 bg-slate-900 px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              statusPillClasses(task.status),
            ].join(" ")}
          >
            {statusLabel ?? task.status}
          </span>

          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              priorityPillClasses(task.priority),
            ].join(" ")}
          >
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-400">
            {assignee ? assignee.name.charAt(0).toUpperCase() : "?"}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {assignee ? assignee.name : "Unassigned"}
            </p>

            {assignee && (
              <p className="truncate text-xs text-slate-500">
                {assignee.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500">Due</p>

          <p
            className={[
              "mt-0.5 text-sm font-medium",
              isOverdue(task.dueDate, task.status)
                ? "text-red-400"
                : "text-white",
            ].join(" ")}
          >
            {formatDueDate(task.dueDate)}
          </p>
        </div>

        {taskLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {taskLabels.map((label) => (
              <span
                key={label.id}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{
                  backgroundColor: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-600 sm:ml-auto">
          <p>Created {formatDateTime(task.createdAt)}</p>

          <p className="mt-0.5">
            Updated {formatDateTime(task.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    );
  }

  function handleSave() {
    if (!title.trim()) {
      return;
    }

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId,

      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,

      labelIds: selectedLabelIds,
    });
  }

  async function handleDeleteTask() {
    if (deleteMutation.isPending) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete this task?",
      message:
        "The task, its comments, and its history will be permanently removed.",
      confirmLabel: "Delete task",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate();
  }

  if (!organizationId || !projectId || !taskId) {
    return <div className="text-sm text-red-400">Invalid task URL.</div>;
  }

  if (taskQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 h-4 w-24 animate-pulse rounded bg-slate-800" />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            to={`/organizations/${organizationId}/projects/${projectId}/tasks`}
            className="text-sm text-slate-500 hover:text-slate-300"
          >
            ← Tasks
          </Link>
        </div>

        <ErrorState
          title="Failed to load task."
          actionLabel="Retry"
          onAction={() => void taskQuery.refetch()}
        />
      </div>
    );
  }

  const taskLabels = labels.filter((label) =>
    (task.labelIds ?? []).includes(label.id),
  );

  const assignee = members.find((member) => member.userId === task.assigneeId);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back */}
      <div className="mb-6">
        <Link
          to={`/organizations/${organizationId}/projects/${projectId}/tasks`}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← Tasks
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-indigo-400">
            {task.identifier}
          </p>

          {!isEditing ? (
            <h1 className="mt-2 break-words text-2xl font-bold text-white">
              {task.title}
            </h1>
          ) : (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xl font-bold text-white outline-none focus:border-indigo-500"
            />
          )}

          <p className="mt-2 text-sm text-slate-500">Task #{task.number}</p>
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Edit
            </button>

            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDeleteTask()}
              className="rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}

        {deleteMutation.isError && (
          <p className="mt-3 text-sm text-red-400">
            Only the organization owner can delete this task.
          </p>
        )}
      </div>

      {!isEditing &&
        renderTaskDetailsStrip({
          statusLabel:
            statuses.find((item) => item.value === task.status)?.label,
          task,
          assignee,
          taskLabels,
        })}

      {isEditing ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="space-y-5">
            {/* Description */}
            <div>
              <label className="text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>

            {/* Status / Priority / Assignee / Due date */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {statuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TaskPriority)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                >
                  {priorities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Assign to
                </label>

                <select
                  value={assigneeId ?? ""}
                  onChange={(event) =>
                    setAssigneeId(event.target.value || null)
                  }
                  disabled={membersQuery.isLoading}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Unassigned</option>

                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Due date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="text-sm font-medium text-slate-300">
                Labels
              </label>

              {labels.length === 0 ? (
                <p className="mt-2 text-xs text-slate-600">
                  No labels available.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {labels.map((label) => {
                    const selected = selectedLabelIds.includes(label.id);

                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={[
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          selected
                            ? "border-transparent text-white"
                            : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                        ].join(" ")}
                        style={
                          selected
                            ? {
                                backgroundColor: label.color,
                              }
                            : undefined
                        }
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {updateMutation.isError && (
              <div className="rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                Failed to update task. Please try again.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={updateMutation.isPending || !title.trim()}
                onClick={handleSave}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>

              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={cancelEditing}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-white">Description</h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                {task.description || "No description provided."}
              </p>
            </div>

            <CommentsSection
              organizationId={organizationId}
              projectId={projectId}
              taskId={taskId}
            />
          </div>

          {/* Right rail: activity */}
          <div>
          <ActivityFeed
            organizationId={organizationId}
            projectId={projectId}
            taskId={taskId}
          />
          </div>
        </div>
      )}
    </div>
  );
}
