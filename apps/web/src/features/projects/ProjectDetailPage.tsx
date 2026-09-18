import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getProject } from "./project.api.js";

export function ProjectDetailPage() {
  const { organizationId, projectId } = useParams<{
    organizationId: string;
    projectId: string;
  }>();

  const projectQuery = useQuery({
    queryKey: ["project", organizationId, projectId],
    queryFn: () =>
      getProject(organizationId!, projectId!),
    enabled: Boolean(organizationId && projectId),
  });

  if (!organizationId || !projectId) {
    return <div>Project not found.</div>;
  }

  if (projectQuery.isLoading) {
    return (
      <div className="text-slate-400">
        Loading project...
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-400">
        Failed to load project.
      </div>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <Link
          to={`/organizations/${organizationId}`}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← Back to organization
        </Link>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-400">
                {project.key}
              </span>

              <span className="text-xs text-slate-600">
                Project
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-white">
              {project.name}
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {project.description ||
                "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">
            Tasks
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            —
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">
            Members
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            —
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">
            Status
          </p>

          <p className="mt-2 text-sm font-semibold text-emerald-400">
            Active
          </p>
        </div>
      </div>

<div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-white">
        Tasks
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Manage tasks and track project progress.
      </p>
    </div>

    <Link
      to={`/organizations/${organizationId}/projects/${projectId}/tasks`}
      className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
    >
      View tasks
    </Link>
  </div>
</div>
    </div>
  );
}
