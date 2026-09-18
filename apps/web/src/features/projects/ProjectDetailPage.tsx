import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteProject, getProject } from "./project.api.js";
import { listTasks } from "../tasks/task.api.js";
import { listMembers } from "../organizations/membership.api.js";
import { useAuth } from "../auth/use-auth.js";
import { useToast } from "../../components/ui/Toast.js";
import { useConfirm } from "../../components/ui/ConfirmDialog.js";
import {
  ErrorState,
  SkeletonCard,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

export function ProjectDetailPage() {
  const { organizationId, projectId } = useParams<{
    organizationId: string;
    projectId: string;
  }>();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [deleteError, setDeleteError] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", organizationId, projectId],
    queryFn: () =>
      getProject(organizationId!, projectId!),
    enabled: Boolean(organizationId && projectId),
  });

  const membersQuery = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: () => listMembers(organizationId!),
    enabled: Boolean(organizationId),
  });

  const tasksCountQuery = useQuery({
    queryKey: [
      "project-tasks",
      organizationId,
      projectId,
      "count",
    ],
    queryFn: () =>
      listTasks(organizationId!, projectId!, {
        page: 1,
        limit: 1,
      }),
    enabled: Boolean(organizationId && projectId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(organizationId!, projectId!),
    onSuccess: async () => {
      setDeleteError("");
      toast.success("Project deleted.");
      await queryClient.invalidateQueries({
        queryKey: ["organization-projects", organizationId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-projects"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-tasks"],
      });

      await navigate(`/organizations/${organizationId}/projects`);
    },
    onError: (error) => {
      setDeleteError("Only the organization owner can delete this project.");
      toast.error(getErrorMessage(error, "Failed to delete project."));
    },
  });

  const isOwner =
    membersQuery.data?.some(
      (member) => member.userId === user?.id && member.role === "OWNER",
    ) ?? false;

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete "${projectQuery.data?.name}"?`,
      message:
        "This permanently removes all its tasks, comments, and activity. This cannot be undone.",
      confirmLabel: "Delete project",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate();
  }

  if (!organizationId || !projectId) {
    return <div>Project not found.</div>;
  }

  if (projectQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-4 w-32 animate-pulse rounded bg-slate-800" />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="mx-auto max-w-7xl">
        <ErrorState
          title="Failed to load project."
          actionLabel="Retry"
          onAction={() => void projectQuery.refetch()}
        />
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

            {deleteError && (
              <p className="mt-3 text-sm text-red-400">
                {deleteError}
              </p>
            )}
          </div>

          {isOwner && (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
              className="shrink-0 rounded-lg border border-red-900 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete project"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">
            Tasks
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {tasksCountQuery.data?.pagination.total ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-500">
            Members
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {membersQuery.data?.length ?? "—"}
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
