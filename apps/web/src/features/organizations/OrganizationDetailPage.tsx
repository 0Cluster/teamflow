import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteOrganization, getOrganization } from "./organization.api.js";
import { OrganizationActivityFeed } from "../activity/OrganizationActivityFeed.js";
import { useLiveMembers } from "../../hooks/use-live-projects.js";
import { useAuth } from "../auth/use-auth.js";
import {
  addMember,
  leaveOrganization,
  listMembers,
  removeMember,
  updateMemberRole,
} from "./membership.api.js";
import type {
  MembershipRole,
  OrganizationMember,
} from "./membership.types.js";

const roles: MembershipRole[] = [
  "ADMIN",
  "MEMBER",
  "VIEWER",
];

export function OrganizationDetailPage() {
  const { organizationId } = useParams<{
    organizationId: string;
  }>();

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [role, setRole] =
    useState<MembershipRole>("MEMBER");
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [transferError, setTransferError] = useState("");

  const organizationQuery = useQuery({
    queryKey: ["organizations", organizationId],
    queryFn: () => getOrganization(organizationId!),
    enabled: Boolean(organizationId),
  });

  const membersQuery = useQuery({
    queryKey: ["organizations", organizationId, "members"],
    queryFn: () => listMembers(organizationId!),
    enabled: Boolean(organizationId),
  });

  useLiveMembers(organizationId);

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addMember(organizationId!, {
        email: email.trim(),
        role,
      }),
    onSuccess: async () => {
      setEmail("");
      setRole("MEMBER");
      setError("");

      await queryClient.invalidateQueries({
        queryKey: [
          "organizations",
          organizationId,
          "members",
        ],
      });
    },
    onError: () => {
      setError("Failed to add member.");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: MembershipRole;
    }) =>
      updateMemberRole(
        organizationId!,
        userId,
        { role },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "organizations",
          organizationId,
          "members",
        ],
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      removeMember(organizationId!, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          "organizations",
          organizationId,
          "members",
        ],
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => leaveOrganization(organizationId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-projects"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-tasks"],
      });

      await navigate("/organizations");
    },
    onError: () => {
      setTransferError(
        "Failed to leave. Owners must transfer ownership first.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganization(organizationId!),
    onSuccess: async () => {
      setDeleteError("");

      await queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-projects"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-tasks"],
      });

      await navigate("/organizations");
    },
    onError: () => {
      setDeleteError(
        "Only the organization owner can delete this organization.",
      );
    },
  });

  const myMembership = membersQuery.data?.find(
    (member) => member.userId === user?.id,
  );
  const isOwner = myMembership?.role === "OWNER";
  const canManageMembers =
    myMembership?.role === "OWNER" ||
    myMembership?.role === "ADMIN";

  /*
   * Mirrors the backend rules in membership.service.ts:
   * owners manage everyone except the owner, admins manage
   * members/viewers only, nobody else manages anyone.
   */
  function canManageMember(target: OrganizationMember): boolean {
    if (myMembership?.role === "OWNER") {
      return target.role !== "OWNER";
    }

    if (myMembership?.role === "ADMIN") {
      return (
        target.role === "MEMBER" || target.role === "VIEWER"
      );
    }

    return false;
  }

  function handleLeave() {
    if (
      !window.confirm(
        "Leave this organization? You will lose access to its projects and tasks.",
      )
    ) {
      return;
    }

    leaveMutation.mutate();
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete "${organizationQuery.data?.name}" and all its projects, tasks, and data? This cannot be undone.`,
      )
    ) {
      return;
    }

    deleteMutation.mutate();
  }

  function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setError("");
    addMemberMutation.mutate();
  }

  function handleRoleChange(
    member: OrganizationMember,
    newRole: MembershipRole,
  ) {
    if (member.role === "OWNER") {
      return;
    }

    updateRoleMutation.mutate({
      userId: member.userId,
      role: newRole,
    });
  }

  function handleRemove(member: OrganizationMember) {
    if (member.role === "OWNER") {
      return;
    }

    if (
      !window.confirm(
        `Remove ${member.name} from this organization?`,
      )
    ) {
      return;
    }

    removeMemberMutation.mutate(member.userId);
  }

  function handleTransferOwnership(member: OrganizationMember) {
    if (member.role === "OWNER") {
      return;
    }

    if (
      !window.confirm(
        `Transfer ownership to ${member.name}? You will become an admin. This cannot be undone except by the new owner.`,
      )
    ) {
      return;
    }

    setTransferError("");

    updateRoleMutation.mutate(
      {
        userId: member.userId,
        role: "OWNER",
      },
      {
        onError: () => {
          setTransferError(
            "Failed to transfer ownership. Only the owner can transfer it.",
          );
        },
      },
    );
  }

  if (!organizationId) {
    return (
      <div className="text-red-400">
        Invalid organization ID.
      </div>
    );
  }

  if (organizationQuery.isLoading) {
    return (
      <div className="text-slate-400">
        Loading organization...
      </div>
    );
  }

  if (organizationQuery.isError) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/40 p-6 text-red-300">
        Failed to load organization.
      </div>
    );
  }

  const organization = organizationQuery.data;
if (!organization) {
  return <div>Organization not found.</div>;
}

  return (
<div className="mx-auto max-w-7xl">
  <div className="mb-6">
    <Link
      to="/organizations"
      className="text-sm text-slate-500 hover:text-slate-300"
    >
      ← Organizations
    </Link>
  </div>

  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold text-white">
        {organization.name}
      </h1>

      <p className="mt-1 mb-4 break-all text-sm text-slate-500">
        @{organization.slug}
      </p>
    </div>

<div className="flex w-fit shrink-0 flex-wrap gap-2">
  <Link
    to={`/organizations/${organizationId}/projects`}
    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
  >
    View projects
  </Link>

  <Link
    to={`/organizations/${organizationId}/labels`}
    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
  >
    Manage labels
  </Link>
</div>
  </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-semibold text-white">
              Members
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              People who belong to this organization.
            </p>

            {transferError && (
              <p className="mt-2 text-sm text-red-400">
                {transferError}
              </p>
            )}
          </div>

          {membersQuery.isLoading && (
            <div className="p-5 text-sm text-slate-400">
              Loading members...
            </div>
          )}

          {membersQuery.isError && (
            <div className="p-5 text-sm text-red-400">
              Failed to load members.
            </div>
          )}

          <div className="divide-y divide-slate-800">
            {membersQuery.data?.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                isSelf={member.userId === user?.id}
                canManage={canManageMember(member)}
                showTransfer={isOwner}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                onTransferOwnership={handleTransferOwnership}
                onLeave={handleLeave}
                updating={
                  updateRoleMutation.isPending
                }
                removing={
                  removeMemberMutation.isPending
                }
                leaving={leaveMutation.isPending}
              />
            ))}
          </div>
        </section>

        <section className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-6">
          {canManageMembers ? (
            <>
              <h2 className="text-lg font-semibold text-white">
                Add member
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add an existing TeamFlow user by email.
              </p>

              <AddMemberForm
                email={email}
                setEmail={setEmail}
                role={role}
                setRole={setRole}
                error={error}
                onSubmit={handleAddMember}
                isPending={addMemberMutation.isPending}
              />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white">
                Members
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Only organization owners and admins can manage
                members.
              </p>
            </>
          )}
        </section>
      </div>

      {isOwner && (
        <section className="mt-6 rounded-xl border border-red-900 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-white">
            Danger zone
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Deleting this organization permanently removes its
            projects, tasks, labels, members, and history. Only
            the owner can do this.
          </p>

          {deleteError && (
            <p className="mt-3 text-sm text-red-400">
              {deleteError}
            </p>
          )}

          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            className="mt-4 rounded-lg border border-red-900 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteMutation.isPending
              ? "Deleting..."
              : "Delete organization"}
          </button>
        </section>
      )}

      <OrganizationActivityFeed organizationId={organizationId} />
    </div>
  );
}

interface AddMemberFormProps {
  email: string;
  setEmail: (value: string) => void;
  role: MembershipRole;
  setRole: (role: MembershipRole) => void;
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

function AddMemberForm({
  email,
  setEmail,
  role,
  setRole,
  error,
  onSubmit,
  isPending,
}: AddMemberFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4"
    >
      <div>
        <label
          htmlFor="member-email"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Email
        </label>

        <input
          id="member-email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="user@example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="member-role"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Role
        </label>

        <select
          id="member-role"
          value={role}
          onChange={(event) =>
            setRole(
              event.target.value as MembershipRole,
            )
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
        >
          {roles.map((memberRole) => (
            <option
              key={memberRole}
              value={memberRole}
            >
              {memberRole}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Adding..."
          : "Add member"}
      </button>
    </form>
  );
}

interface MemberRowProps {
  member: OrganizationMember;
  isSelf: boolean;
  canManage: boolean;
  onRoleChange: (
    member: OrganizationMember,
    role: MembershipRole,
  ) => void;
  onRemove: (member: OrganizationMember) => void;
  onTransferOwnership: (member: OrganizationMember) => void;
  onLeave: () => void;
  showTransfer: boolean;
  updating: boolean;
  removing: boolean;
  leaving: boolean;
}

function MemberRow({
  member,
  isSelf,
  canManage,
  onRoleChange,
  onRemove,
  onTransferOwnership,
  onLeave,
  showTransfer,
  updating,
  removing,
  leaving,
}: MemberRowProps) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-white">
          {member.name}
          {isSelf && (
            <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-400">
              You
            </span>
          )}
        </p>

        <p className="mt-1 truncate text-sm text-slate-500">
          {member.email}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {member.role === "OWNER" ? (
          <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300">
            OWNER
          </span>
        ) : isSelf ? (
          <button
            type="button"
            disabled={leaving}
            onClick={onLeave}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            {leaving ? "Leaving..." : "Leave"}
          </button>
        ) : canManage ? (
          <>
            <select
              value={member.role}
              disabled={updating || removing}
              onChange={(event) =>
                onRoleChange(
                  member,
                  event.target.value as MembershipRole,
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={removing}
              onClick={() => onRemove(member)}
              className="rounded-lg border border-red-900 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-950 disabled:opacity-50"
            >
              Remove
            </button>

            {showTransfer && (
              <button
                type="button"
                disabled={updating || removing}
                onClick={() => onTransferOwnership(member)}
                title="Transfer organization ownership. You will become an admin."
                className="rounded-lg border border-amber-900 px-3 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-950/40 disabled:opacity-50"
              >
                Make owner
              </button>
            )}
          </>
        ) : (
          <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300">
            {member.role}
          </span>
        )}
      </div>
    </div>
  );
}
