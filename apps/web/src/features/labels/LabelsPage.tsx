import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/use-auth.js";

import {
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
} from "./label.api.js";

import type { Label } from "./label.types.js";

export function LabelsPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");

  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#6366f1");
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const labelsQuery = useQuery({
    queryKey: ["organization-labels", organizationId],
    queryFn: () => listLabels(organizationId!),
    enabled: Boolean(organizationId) && !authLoading && isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createLabel(organizationId!, {
        name: name.trim(),
        color,
      }),

    onSuccess: () => {
      setName("");
      setColor("#6366f1");

      void queryClient.invalidateQueries({
        queryKey: ["organization-labels", organizationId],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      labelId,
      name,
      color,
    }: {
      labelId: string;
      name: string;
      color: string;
    }) =>
      updateLabel(organizationId!, labelId, {
        name,
        color,
      }),

    onSuccess: () => {
      setEditingLabelId(null);

      void queryClient.invalidateQueries({
        queryKey: ["organization-labels", organizationId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(organizationId!, labelId),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization-labels", organizationId],
      });
    },
  });

  function startEditing(label: Label) {
    setEditingLabelId(label.id);
    setEditingName(label.name);
    setEditingColor(label.color);
  }

  function cancelEditing() {
    setEditingLabelId(null);
    setEditingName("");
    setEditingColor("#6366f1");
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || createMutation.isPending) {
      return;
    }

    createMutation.mutate();
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>, labelId: string) {
    event.preventDefault();

    if (!editingName.trim() || updateMutation.isPending) {
      return;
    }

    updateMutation.mutate({
      labelId,
      name: editingName.trim(),
      color: editingColor,
    });
  }

  function handleDelete(label: Label) {
    if (deleteMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(`Delete the "${label.name}" label?`);

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(label.id);
  }

  if (!organizationId) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-sm text-red-300">
        Organization ID is missing.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          to={`/organizations/${organizationId}`}
          className="text-sm text-slate-500 transition hover:text-slate-300"
        >
          ← Organization
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Labels</h1>

        <p className="mt-2 text-sm text-slate-400">
          Create labels to organize and filter tasks.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Create label</h2>

        <form
          onSubmit={handleCreate}
          className="grid gap-4 sm:grid-cols-[1fr_auto_auto]"
        >
          <div>
            <label className="text-sm font-medium text-slate-300">Name</label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Bug"
              maxLength={50}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Color</label>

            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="mt-1 h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create label"}
            </button>
          </div>
        </form>

        {createMutation.isError && (
          <p className="mt-3 text-sm text-red-400">Failed to create label.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Your labels</h2>
        </div>

        {labelsQuery.isLoading && (
          <div className="p-5 text-sm text-slate-500">Loading labels...</div>
        )}

        {labelsQuery.isError && (
          <div className="p-5 text-sm text-red-400">Failed to load labels.</div>
        )}

        {!labelsQuery.isLoading &&
          !labelsQuery.isError &&
          labelsQuery.data?.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No labels yet.</p>

              <p className="mt-1 text-xs text-slate-600">
                Create your first label above.
              </p>
            </div>
          )}

        <div className="divide-y divide-slate-800">
          {labelsQuery.data?.map((label) => (
            <div key={label.id} className="p-5">
              {editingLabelId === label.id ? (
                <form
                  onSubmit={(event) => handleUpdate(event, label.id)}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <label className="text-sm font-medium text-slate-300">
                      Name
                    </label>

                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      maxLength={50}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300">
                      Color
                    </label>

                    <input
                      type="color"
                      value={editingColor}
                      onChange={(event) => setEditingColor(event.target.value)}
                      className="mt-1 h-10 w-16 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 p-1"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!editingName.trim() || updateMutation.isPending}
                    className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />

                    <div className="min-w-0">
                      <p className="font-medium text-white">{label.name}</p>

                      <p className="text-xs text-slate-500">{label.color}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(label)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(label)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg border border-red-900 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
