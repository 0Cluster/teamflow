import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";

import {
  createProject,
  listProjects,
} from "./project.api.js";

import type { CreateProjectInput } from "./project.types.js";
import { useLiveProjects } from "../../hooks/use-live-projects.js";
import { useToast } from "../../components/ui/Toast.js";
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

export function ProjectsPage() {
  const { organizationId } = useParams<{
    organizationId: string;
  }>();

  const queryClient = useQueryClient();
  const toast = useToast();

  useLiveProjects(organizationId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>();

  const projectsQuery = useQuery({
    queryKey: ["organization-projects", organizationId],
    queryFn: () => listProjects(organizationId!),
    enabled: Boolean(organizationId),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateProjectInput) =>
      createProject(organizationId!, input),

    onSuccess: () => {
      reset();

      toast.success("Project created.");

      void queryClient.invalidateQueries({
        queryKey: ["organization-projects", organizationId],
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create project."));
    },
  });

  if (!organizationId) {
    return <div>Organization not found.</div>;
  }

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

  function onSubmit(input: CreateProjectInput) {
    createMutation.mutate(input);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Projects
        </h1>

        <p className="mt-2 text-slate-400">
          Create and manage projects in this organization.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              hint="Create your first project to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/organizations/${organizationId}/projects/${project.id}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900 p-5 no-underline transition hover:border-slate-700 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                        {project.key}
                      </p>

                      <h2 className="mt-2 truncate text-lg font-semibold text-white">
                        {project.name}
                      </h2>
                    </div>

                    <span className="text-slate-600">
                      →
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                    {project.description ||
                      "No description provided."}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold text-white">
            Create project
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            You need organization admin permissions.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-5 space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Name
              </label>

              <input
                {...register("name", {
                  required: "Name is required",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters",
                  },
                  maxLength: {
                    value: 100,
                    message: "Name must be at most 100 characters",
                  },
                })}
                placeholder="TeamFlow API"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />

              {errors.name && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Key
              </label>

              <input
                {...register("key", {
                  required: "Key is required",
                  pattern: {
                    value: /^[A-Za-z][A-Za-z0-9]{1,9}$/,
                    message:
                      "2-10 letters/numbers starting with a letter",
                  },
                })}
                placeholder="API"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm uppercase text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />

              {errors.key ? (
                <p className="mt-1 text-xs text-red-400">
                  {errors.key.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-600">
                  Used for task identifiers such as API-42.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Description
              </label>

              <textarea
                {...register("description")}
                rows={4}
                placeholder="What is this project about?"
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>

            {createMutation.isError && (
              <p className="text-sm text-red-400">
                Failed to create project.
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending
                ? "Creating..."
                : "Create project"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
