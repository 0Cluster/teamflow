import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { listOrganizations } from "../organizations/organization.api.js";
import { listMyProjects } from "./project.api.js";
import { useLiveMyProjects } from "../../hooks/use-live-projects.js";
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
} from "../../components/ui/Feedback.js";

export function MyProjectsPage() {
  const navigate = useNavigate();

  const projectsQuery = useQuery({
    queryKey: ["my-projects"],
    queryFn: listMyProjects,
  });

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
  });

  useLiveMyProjects(
    (organizationsQuery.data ?? []).map((org) => org.id),
  );

  if (projectsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-slate-800" />

        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl">
        <ErrorState
          title="Failed to load projects."
          actionLabel="Retry"
          onAction={() => void projectsQuery.refetch()}
        />
      </div>
    );
  }

  const projects = projectsQuery.data ?? [];
  const orgNameById = new Map(
    (organizationsQuery.data ?? []).map((org) => [org.id, org.name]),
  );

  const projectsByOrg = new Map<string, typeof projects>();
  for (const project of projects) {
    const group = projectsByOrg.get(project.organizationId) ?? [];
    group.push(project);
    projectsByOrg.set(project.organizationId, group);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Projects</h1>

        <p className="mt-2 text-slate-400">
          All projects you can access across your organizations.
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Projects appear here once you join an organization with projects."
          actionLabel="Go to organizations"
          onAction={() => void navigate("/organizations")}
        />
      ) : (
        <div className="space-y-8">
          {[...projectsByOrg.entries()].map(([organizationId, orgProjects]) => (
            <section key={organizationId}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                {orgNameById.get(organizationId) ?? "Organization"}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {orgProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/organizations/${organizationId}/projects/${project.id}`}
                    className="block rounded-xl border border-slate-800 bg-slate-900 p-5 no-underline transition hover:border-slate-700 hover:bg-slate-800"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                      {project.key}
                    </p>

                    <h3 className="mt-2 truncate text-lg font-semibold text-white">
                      {project.name}
                    </h3>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                      {project.description || "No description provided."}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
