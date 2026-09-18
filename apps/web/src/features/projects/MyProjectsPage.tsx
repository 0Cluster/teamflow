import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { listOrganizations } from "../organizations/organization.api.js";
import { listMyProjects } from "./project.api.js";
import { useLiveMyProjects } from "../../hooks/use-live-projects.js";

export function MyProjectsPage() {
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
    return <div className="text-slate-400">Loading projects...</div>;
  }

  if (projectsQuery.isError) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-red-400">
        Failed to load projects.
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
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
          <h2 className="text-lg font-semibold text-white">No projects yet</h2>

          <p className="mt-2 text-sm text-slate-500">
            Projects appear here once you join an organization with projects.
          </p>

          <Link
            to="/organizations"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Go to organizations
          </Link>
        </div>
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
