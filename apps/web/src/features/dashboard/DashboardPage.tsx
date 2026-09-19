import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/use-auth.js";
import { listOrganizations } from "../organizations/organization.api.js";
import { listMyProjects } from "../projects/project.api.js";
import { listMyTasks } from "../tasks/task.api.js";
import { listNotifications } from "../notifications/notification.api.js";
import { SkeletonStat } from "../../components/ui/Feedback.js";

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
    queryKey: ["notifications", { page: 1, limit: 5 }],
    queryFn: () => listNotifications({ page: 1, limit: 5 }),
  });

  const recentNotifications =
    notificationsQuery.data?.notifications ?? [];

  const statsLoading =
    organizationsQuery.isLoading ||
    projectsQuery.isLoading ||
    tasksQuery.isLoading ||
    notificationsQuery.isLoading;

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
        {statsLoading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <DashboardCard
              to="/organizations"
              title="Organizations"
              value={formatCount(organizationsQuery.data?.length)}
              description="Your organizations"
            />

            <DashboardCard
              to="/projects"
              title="Projects"
              value={formatCount(projectsQuery.data?.length)}
              description="Active projects"
            />

            <DashboardCard
              to="/tasks"
              title="Tasks"
              value={formatCount(tasksQuery.data?.pagination.total)}
              description="Assigned to you"
            />

            <DashboardCard
              to="/notifications"
              title="Notifications"
              value={formatCount(notificationsQuery.data?.unreadCount)}
              description="Unread notifications"
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">
              Recent notifications
            </h2>

            <Link
              to="/notifications"
              className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              View all →
            </Link>
          </div>

          {notificationsQuery.isLoading && (
            <p className="mt-4 text-sm text-slate-500">
              Loading...
            </p>
          )}

          {!notificationsQuery.isLoading &&
            recentNotifications.length === 0 && (
              <p className="mt-4 text-sm text-slate-500">
                You&apos;re all caught up.
              </p>
            )}

          <div className="mt-4 space-y-3">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3"
              >
                {!notification.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {notification.title}
                  </p>

                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {notification.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Quick links
          </h2>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/projects"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              View projects
            </Link>

            <Link
              to="/tasks"
              className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              View my tasks
            </Link>

            <Link
              to="/notifications"
              className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              View notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  to: string;
  title: string;
  value: string;
  description: string;
}

function DashboardCard({
  to,
  title,
  value,
  description,
}: DashboardCardProps) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-2 text-3xl font-bold text-white">{value}</p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </Link>
  );
}
