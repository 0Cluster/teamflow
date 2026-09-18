import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ActivityFeed } from "../activity/ActivityFeed.js";
import { CommentsSection } from "../comments/CommentsSection.js";
import { listLabels } from "../labels/label.api.js";
import { listMembers } from "../organizations/membership.api.js";

import { deleteTask, getTask, updateTask } from "./task.api.js";
import { useLiveTasks } from "../../hooks/use-live-tasks.js";

import type {
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "./task.types.js";

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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(organizationId!, projectId!, taskId!),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });

      void navigate(
        `/organizations/${organizationId}/projects/${projectId}/tasks`,
      );
    },
  });

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

  if (!organizationId || !projectId || !taskId) {
    return <div className="text-sm text-red-400">Invalid task URL.</div>;
  }

  if (taskQuery.isLoading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        Loading task...
      </div>
    );
  }

  if (taskQuery.isError || !task) {
    return (
      <div>
        <Link
          to={`/organizations/${organizationId}/projects/${projectId}/tasks`}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← Tasks
        </Link>

        <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-400">
          Failed to load task.
        </div>
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
              onClick={() => {
                if (
                  window.confirm("Are you sure you want to delete this task?")
                ) {
                  deleteMutation.mutate();
                }
              }}
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

            <div className="grid items-start gap-5 md:grid-cols-5">
            <div className="md:col-span-3">
            <CommentsSection
              organizationId={organizationId}
              projectId={projectId}
              taskId={taskId}
            />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 md:col-span-2">
              <h2 className="text-lg font-semibold text-white">Details</h2>

              <div className="mt-4 space-y-4">
                {/* Status */}
                <div>
                  <p className="text-xs text-slate-500">Status</p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {statuses.find((item) => item.value === task.status)?.label}
                  </p>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs text-slate-500">Priority</p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {task.priority}
                  </p>
                </div>

                {/* Assignee */}
                <div>
                  <p className="text-xs text-slate-500">Assignee</p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {assignee
                      ? `${assignee.name} (${assignee.email})`
                      : "Unassigned"}
                  </p>
                </div>

                {/* Due date */}
                <div>
                  <p className="text-xs text-slate-500">Due date</p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString()
                      : "No due date"}
                  </p>
                </div>

                {/* Labels */}
                <div>
                  <p className="text-xs text-slate-500">Labels</p>

                  {taskLabels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                  ) : (
                    <p className="mt-1 text-sm text-slate-600">No labels</p>
                  )}
                </div>

                {/* Created */}
                <div>
                  <p className="text-xs text-slate-500">Created</p>

                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(task.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Updated */}
                <div>
                  <p className="text-xs text-slate-500">Last updated</p>

                  <p className="mt-1 text-sm text-slate-400">
                    {new Date(task.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            </div>
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
