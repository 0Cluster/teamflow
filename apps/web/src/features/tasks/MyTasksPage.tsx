import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { listMyTasks } from "./task.api.js";
import type { TaskPriority, TaskStatus } from "./task.types.js";
import { listOrganizations } from "../organizations/organization.api.js";
import { useLiveMyTasks } from "../../hooks/use-live-tasks.js";
import { ErrorState, SkeletonRow } from "../../components/ui/Feedback.js";

export function MyTasksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
  });

  useLiveMyTasks(
    (organizationsQuery.data ?? []).map((org) => org.id),
  );

  const tasksQuery = useQuery({
    queryKey: ["my-tasks", search, statusFilter, priorityFilter],
    queryFn: () =>
      listMyTasks({
        limit: 50,
        sortBy: "updatedAt",
        sortOrder: "desc",
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      }),
  });

  const tasks = tasksQuery.data?.tasks ?? [];
  const total = tasksQuery.data?.pagination.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My tasks</h1>

        <p className="mt-2 text-slate-400">
          Tasks assigned to you across all organizations ({total}).
        </p>
      </div>

      <div className="mb-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks..."
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TaskStatus | "")
          }
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="DONE">Done</option>
        </select>

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

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatusFilter("");
            setPriorityFilter("");
          }}
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          Clear filters
        </button>
      </div>

      {tasksQuery.isLoading && (
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {tasksQuery.isError && (
        <ErrorState
          title="Failed to load tasks."
          actionLabel="Retry"
          onAction={() => void tasksQuery.refetch()}
        />
      )}

      {!tasksQuery.isLoading && !tasksQuery.isError && tasks.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
          <p className="text-sm font-medium text-white">No tasks assigned.</p>

          <p className="mt-1 text-sm text-slate-500">
            Tasks assigned to you will appear here.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) =>
          task.organizationId ? (
            <Link
              key={task.id}
              to={`/organizations/${task.organizationId}/projects/${task.projectId}/tasks/${task.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 hover:bg-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-indigo-400">
                  {task.identifier}
                </p>

                <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-400">
                  {task.status} · {task.priority}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-semibold text-white">
                {task.title}
              </h3>
            </Link>
          ) : (
            <div
              key={task.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <p className="text-xs font-medium text-indigo-400">
                {task.identifier}
              </p>

              <h3 className="mt-2 text-sm font-semibold text-white">
                {task.title}
              </h3>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
