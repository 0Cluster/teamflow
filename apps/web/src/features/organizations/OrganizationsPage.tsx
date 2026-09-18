import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Link } from "react-router-dom";
import { createOrganization, listOrganizations } from "./organization.api.js";
import { useToast } from "../../components/ui/Toast.js";
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
  });

  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: async () => {
      setName("");
      setError("");

      toast.success("Organization created.");

      await queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
    },
    onError: (mutationError) => {
      const message = getErrorMessage(
        mutationError,
        "Failed to create organization",
      );

      setError(message);
      toast.error(message);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Name is required (at least 2 characters).");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    setError("");

    createMutation.mutate({
      name: name.trim(),
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Organizations</h1>

        <p className="mt-2 text-slate-400">
          Manage the organizations you belong to.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Your organizations
            </h2>
          </div>

          {organizationsQuery.isLoading && (
            <div className="space-y-3">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          )}

          {organizationsQuery.isError && (
            <ErrorState
              title="Failed to load organizations."
              actionLabel="Retry"
              onAction={() => void organizationsQuery.refetch()}
            />
          )}

          {!organizationsQuery.isLoading &&
            !organizationsQuery.isError &&
            organizationsQuery.data?.length === 0 && (
              <EmptyState
                title="No organizations yet."
                hint="Create one to get your team started."
              />
            )}

          <div className="space-y-3">
            {organizationsQuery.data?.map((organization) => (
              <Link
                key={organization.id}
                to={`/organizations/${organization.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white">
                      {organization.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      @{organization.slug}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                    Organization
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Create organization
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create a workspace for your team. The URL slug is generated
            automatically.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="organization-name"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                Name
              </label>

              <input
                id="organization-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Acme Inc."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create organization"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
