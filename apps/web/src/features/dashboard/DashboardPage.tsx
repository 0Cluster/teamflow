import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/use-auth.js";
import { listOrganizations } from "../organizations/organization.api.js";
import { listMyProjects } from "../projects/project.api.js";
import { listMyTasks } from "../tasks/task.api.js";
import { listNotifications } from "../notifications/notification.api.js";

function formatCount(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

export function DashboardPage() {
  const { user } = useAuth();

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
  });

  const projectsQuery = useQuery({
    queryKey: ["my-projects"],
    queryFn: listMyProjects,
  });

  const tasksQuery = useQuery({
    queryKey: ["my-tasks", { page: 1, limit: 1 }],
    queryFn: () => listMyTasks({ page: 1, limit: 1 }),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", { page: 1, limit: 1 }],
    queryFn: () => listNotifications({ page: 1, limit: 1 }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name}
        </h1>

        <p className="mt-2 text-slate-400">
          Here&apos;s what&apos;s happening across your workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Organizations"
          value={formatCount(organizationsQuery.data?.length)}
          description="Your organizations"
        />

        <DashboardCard
          title="Projects"
          value={formatCount(projectsQuery.data?.length)}
          description="Active projects"
        />

        <DashboardCard
          title="Tasks"
          value={formatCount(tasksQuery.data?.pagination.total)}
          description="Assigned to you"
        />

        <DashboardCard
          title="Notifications"
          value={formatCount(notificationsQuery.data?.unreadCount)}
          description="Unread notifications"
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">Quick links</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/projects"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            View projects
          </Link>

          <Link
            to="/tasks"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            View my tasks
          </Link>

          <Link
            to="/notifications"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            View notifications
          </Link>
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
}

function DashboardCard({
  title,
  value,
  description,
}: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-2 text-3xl font-bold text-white">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
