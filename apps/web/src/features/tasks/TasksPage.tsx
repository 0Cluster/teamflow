import { useState, type DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listLabels } from "../labels/label.api.js";
import type { Label } from "../labels/label.types.js";
import { listMembers } from "../organizations/membership.api.js";

import { createTask, listTasks, updateTask } from "./task.api.js";

import type { Task, TaskPriority, TaskStatus } from "./task.types.js";
import { useLiveTasks } from "../../hooks/use-live-tasks.js";

const columns: {
  status: TaskStatus;
  label: string;
}[] = [
  {
    status: "TODO",
    label: "To Do",
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
  },
  {
    status: "IN_REVIEW",
    label: "In Review",
  },
  {
    status: "DONE",
    label: "Done",
  },
];

const VISIBLE_TASKS_PER_COLUMN = 3;

export function TasksPage() {
  const { organizationId, projectId } = useParams<{
    organizationId: string;
    projectId: string;
  }>();

  const queryClient = useQueryClient();

  useLiveTasks({ organizationId, projectId });

  // Create task state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [labelFilter, setLabelFilter] = useState("");

  // Collapsible create form + columns
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedColumns, setExpandedColumns] = useState<
    Partial<Record<TaskStatus, boolean>>
  >({});

  function toggleColumn(status: TaskStatus) {
    setExpandedColumns((current) => ({
      ...current,
      [status]: !current[status],
    }));
  }

  /*
   * Load organization labels.
   */
  const labelsQuery = useQuery({
    queryKey: ["organization-labels", organizationId],
    queryFn: () => listLabels(organizationId!),
    enabled: Boolean(organizationId),
  });

  /*
   * Load organization members.
   */
  const membersQuery = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => listMembers(organizationId!),
    enabled: Boolean(organizationId),
  });

  /*
   * Load project tasks.
   *
   * Status is intentionally not a filter because
   * the Kanban columns already represent task status.
   */
  const tasksQuery = useQuery({
    queryKey: [
      "project-tasks",
      organizationId,
      projectId,
      search,
      assigneeFilter,
      priorityFilter,
      labelFilter,
    ],

    queryFn: () =>
      listTasks(organizationId!, projectId!, {
        limit: 100,
        sortBy: "number",
        sortOrder: "asc",

        search: search.trim() || undefined,

        assigneeId: assigneeFilter || undefined,

        priority: priorityFilter || undefined,

        labelId: labelFilter || undefined,
      }),

    enabled: Boolean(organizationId && projectId),
  });

  /*
   * Create task.
   */
  const createMutation = useMutation({
    mutationFn: () =>
      createTask(organizationId!, projectId!, {
        title: title.trim(),

        description: description.trim() || undefined,

        priority,

        assigneeId: assigneeId || undefined,

        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,

        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      }),

    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueDate("");
      setAssigneeId("");
      setSelectedLabelIds([]);

      void queryClient.invalidateQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });
    },
  });

  /*
   * Update task status.
   */
  const updateMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(organizationId!, projectId!, taskId, {
        status,
      }),

    onMutate: async ({ taskId, status }) => {
      const queryKey = [
        "project-tasks",
        organizationId,
        projectId,
        search,
        assigneeFilter,
        priorityFilter,
        labelFilter,
      ];

      await queryClient.cancelQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });

      const previous = queryClient.getQueryData<TasksResponseLike>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,

          tasks: previous.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                }
              : task,
          ),
        });
      }

      return {
        previous,
        queryKey,
      };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project-tasks", organizationId, projectId],
      });
    },
  });

  function handleDrop(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault();

    const taskId = event.dataTransfer.getData("taskId");

    if (!taskId) {
      return;
    }

    updateMutation.mutate({
      taskId,
      status,
    });
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    );
  }

  if (!organizationId || !projectId) {
    return (
      <div className="text-sm text-red-400">
        Invalid organization or project.
      </div>
    );
  }

  const tasks = tasksQuery.data?.tasks ?? [];
  const labels = labelsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  /*
   * Used to sort tasks by assignee name.
   * Unassigned tasks are placed after assigned tasks.
   */
  const memberNameById = new Map(
    members.map((member) => [member.userId, member.name.toLowerCase()]),
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-4">
        <Link
          to={`/organizations/${organizationId}/projects/${projectId}`}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← Project
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>

            <p className="mt-0 text-sm text-slate-500">
              Manage tasks and track project progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            {showCreateForm ? "Hide form" : "+ New task"}
          </button>
        </div>
      </div>

      {/* Create Task */}
      {showCreateForm && (
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Create task</h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();

            if (!title.trim() || createMutation.isPending) {
              return;
            }

            createMutation.mutate();
          }}
          className="grid gap-2 md:grid-cols-2"
        >
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-300">Title</label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Task title"
              className="mt-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />
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
              className="mt-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Assign to
            </label>

            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="mt-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Due date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-300">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description (optional)"
              rows={4}
              className="mt-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="text-sm font-medium text-slate-300">Labels</label>

            {labels.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {labels.map((label) => {
                  const selected = selectedLabelIds.includes(label.id);

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={[
                        "rounded-full border px-2 py-1.5 text-xs font-medium transition",
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
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                No labels available.
              </p>
            )}
          </div>

          {/* Create Button */}
          <div>
            <button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="grid gap-2 md:grid-cols-5">
          {/* Search */}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
          />

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">All assignees</option>

            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as TaskPriority | "")
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Label */}
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
          >
            <option value="">All labels</option>

            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>

          {/* Clear */}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAssigneeFilter("");
              setPriorityFilter("");
              setLabelFilter("");
            }}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Loading */}
      {tasksQuery.isLoading && (
        <div className="py-9 text-center text-sm text-slate-500">
          Loading tasks...
        </div>
      )}

      {/* Error */}
      {tasksQuery.isError && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-400">
          Failed to load tasks.
        </div>
      )}

      {/* Kanban */}
      {!tasksQuery.isLoading && !tasksQuery.isError && (
        <div className="grid gap-2 overflow-x-auto pb-4 lg:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = tasks
              .filter((task) => task.status === column.status)
              .sort((a, b) => {
                const aName = a.assigneeId
                  ? (memberNameById.get(a.assigneeId) ?? "")
                  : "";

                const bName = b.assigneeId
                  ? (memberNameById.get(b.assigneeId) ?? "")
                  : "";

                // Assigned tasks first, unassigned last.
                if (!aName && bName) {
                  return 1;
                }

                if (aName && !bName) {
                  return -1;
                }

                const assigneeComparison = aName.localeCompare(bName);

                if (assigneeComparison !== 0) {
                  return assigneeComparison;
                }

                return a.number - b.number;
              });

            const expanded = expandedColumns[column.status] ?? false;
            const visibleTasks = expanded
              ? columnTasks
              : columnTasks.slice(0, VISIBLE_TASKS_PER_COLUMN);

            return (
              <div
                key={column.status}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, column.status)}
                className="min-h-[421px] min-w-[280px] rounded-xl border border-slate-800 bg-slate-900/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {column.label}
                  </h3>

                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {visibleTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      labels={labels}
                      members={members}
                      organizationId={organizationId}
                      projectId={projectId}
                    />
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-800 p-5 text-center text-xs text-slate-600">
                      Drop tasks here
                    </div>
                  )}

                  {columnTasks.length > VISIBLE_TASKS_PER_COLUMN && (
                    <button
                      type="button"
                      onClick={() => toggleColumn(column.status)}
                      className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      {expanded
                        ? "Show less"
                        : `Show all ${columnTasks.length}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TasksResponseLike {
  tasks: Task[];
  pagination: unknown;
}

interface TaskCardProps {
  task: Task;
  labels: Label[];
  members: {
    userId: string;
    name: string;
    email: string;
    role: string;
    joinedAt: string;
  }[];
  organizationId: string;
  projectId: string;
}

function TaskCard({
  task,
  labels,
  members,
  organizationId,
  projectId,
}: TaskCardProps) {
  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData("taskId", task.id);

    event.dataTransfer.effectAllowed = "move";
  }

  const taskLabels = labels.filter((label) =>
    (task.labelIds ?? []).includes(label.id),
  );

  const assignee = members.find((member) => member.userId === task.assigneeId);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab rounded-lg border border-slate-700 bg-slate-950 p-4 transition hover:border-slate-600 hover:bg-slate-900 active:cursor-grabbing"
    >
      {/* Task link */}
      <Link
        to={`/organizations/${organizationId}/projects/${projectId}/tasks/${task.id}`}
        draggable={false}
        className="block"
      >
        <p className="text-xs font-medium text-indigo-400">{task.identifier}</p>

        <h4 className="mt-2 text-sm font-semibold text-white hover:text-indigo-400">
          {task.title}
        </h4>
      </Link>

      {/* Description */}
      {task.description && (
        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      )}

      {/* Assignee */}
      <p className="mt-2 text-xs text-slate-500">
        {assignee ? `Assigned to ${assignee.name}` : "Unassigned"}
      </p>

      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {taskLabels.map((label) => (
            <span
              key={label.id}
              className="rounded-full px-2 py-1 text-[10px] font-semibold text-white"
              style={{
                backgroundColor: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <p className="mt-1 text-xs text-slate-500">
          Due {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}

      {/* Priority + number */}
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-400">
          {task.priority}
        </span>

        <span className="text-xs text-slate-600">#{task.number}</span>
      </div>
    </div>
  );
}
