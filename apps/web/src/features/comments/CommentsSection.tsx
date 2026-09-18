import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "../auth/use-auth.js";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "./comment.api.js";
import type { Comment } from "./comment.types.js";
import { useToast } from "../../components/ui/Toast.js";
import { useConfirm } from "../../components/ui/ConfirmDialog.js";
import {
  EmptyState,
  ErrorState,
  SkeletonRow,
} from "../../components/ui/Feedback.js";
import { getErrorMessage } from "../../lib/api-error.js";

interface CommentsSectionProps {
  organizationId: string;
  projectId: string;
  taskId: string;
}

export function CommentsSection({
  organizationId,
  projectId,
  taskId,
}: CommentsSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [content, setContent] = useState("");
  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);
  const [editingContent, setEditingContent] =
    useState("");
  const [expanded, setExpanded] = useState(false);

  const commentsQuery = useQuery({
    queryKey: [
      "task-comments",
      organizationId,
      projectId,
      taskId,
    ],
    queryFn: () =>
      listComments(
        organizationId,
        projectId,
        taskId,
      ),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createComment(
        organizationId,
        projectId,
        taskId,
        {
          content: content.trim(),
        },
      ),

    onSuccess: () => {
      setContent("");

      toast.success("Comment posted.");

      void queryClient.invalidateQueries({
        queryKey: [
          "task-comments",
          organizationId,
          projectId,
          taskId,
        ],
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to add comment."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) =>
      updateComment(
        organizationId,
        projectId,
        taskId,
        commentId,
        { content },
      ),

    onSuccess: () => {
      setEditingCommentId(null);
      setEditingContent("");

      toast.success("Comment updated.");

      void queryClient.invalidateQueries({
        queryKey: [
          "task-comments",
          organizationId,
          projectId,
          taskId,
        ],
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update comment."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteComment(
        organizationId,
        projectId,
        taskId,
        commentId,
      ),

    onSuccess: () => {
      toast.success("Comment deleted.");

      void queryClient.invalidateQueries({
        queryKey: [
          "task-comments",
          organizationId,
          projectId,
          taskId,
        ],
      });
    },

    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete comment."));
    },
  });

  function handleCreateComment(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!content.trim() || createMutation.isPending) {
      return;
    }

    createMutation.mutate();
  }

  function startEditing(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditingContent("");
  }

  function handleUpdateComment(
    event: React.FormEvent<HTMLFormElement>,
    commentId: string,
  ) {
    event.preventDefault();

    const trimmedContent = editingContent.trim();

    if (
      !trimmedContent ||
      updateMutation.isPending
    ) {
      return;
    }

    updateMutation.mutate({
      commentId,
      content: trimmedContent,
    });
  }

  async function handleDeleteComment(commentId: string) {
    if (deleteMutation.isPending) {
      return;
    }

    const confirmed = await confirm({
      title: "Delete this comment?",
      message: "This cannot be undone.",
      confirmLabel: "Delete comment",
      danger: true,
    });

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(commentId);
  }

  const comments = commentsQuery.data ?? [];

  const visibleComments = expanded
    ? comments
    : comments.slice(0, VISIBLE_COMMENTS_LIMIT);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">
          Comments
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Discuss this task with your team.
        </p>
      </div>

      <form
        onSubmit={handleCreateComment}
        className="mb-8"
      >
        <textarea
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
          placeholder="Write a comment..."
          rows={3}
          maxLength={5000}
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {content.length}/5000
          </span>

          <button
            type="submit"
            disabled={
              !content.trim() ||
              createMutation.isPending
            }
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending
              ? "Posting..."
              : "Add comment"}
          </button>
        </div>

        {createMutation.isError && (
          <p className="mt-2 text-sm text-red-400">
            Failed to add comment.
          </p>
        )}
      </form>

      {commentsQuery.isLoading && (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {commentsQuery.isError && (
        <ErrorState
          title="Failed to load comments."
          actionLabel="Retry"
          onAction={() => void commentsQuery.refetch()}
        />
      )}

      {!commentsQuery.isLoading &&
        !commentsQuery.isError &&
        comments.length === 0 && (
          <EmptyState
            title="No comments yet."
            hint="Be the first to start the discussion."
          />
        )}

      <div className="space-y-5">
        {visibleComments.map((comment) => {
          const isAuthor =
            comment.authorId === user?.id;

          const authorName =
            comment.author?.name ??
            (isAuthor ? user?.name : "Unknown user");

          const authorEmail =
            comment.author?.email ?? "";

          const isEditing =
            editingCommentId === comment.id;

          return (
            <article
              key={comment.id}
              className="border-b border-slate-800 pb-5 last:border-b-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {authorName}
                    </span>

                    {authorEmail && (
                      <span className="text-xs text-slate-600">
                        {authorEmail}
                      </span>
                    )}

                    <span className="text-xs text-slate-600">
                      {formatCommentDate(
                        comment.createdAt,
                      )}
                    </span>
                  </div>
                </div>

                {isAuthor && !isEditing && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startEditing(comment)
                      }
                      className="text-xs font-medium text-slate-500 transition hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteComment(
                          comment.id,
                        )
                      }
                      disabled={
                        deleteMutation.isPending
                      }
                      className="text-xs font-medium text-red-500 transition hover:text-red-400 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <form
                  onSubmit={(event) =>
                    handleUpdateComment(
                      event,
                      comment.id,
                    )
                  }
                  className="mt-3"
                >
                  <textarea
                    value={editingContent}
                    onChange={(event) =>
                      setEditingContent(
                        event.target.value,
                      )
                    }
                    rows={3}
                    maxLength={5000}
                    className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  />

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        !editingContent.trim() ||
                        updateMutation.isPending
                      }
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updateMutation.isPending
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </div>

                  {updateMutation.isError && (
                    <p className="mt-2 text-xs text-red-400">
                      Failed to update comment.
                    </p>
                  )}
                </form>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {comment.content}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {comments.length > VISIBLE_COMMENTS_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-6 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          {expanded
            ? "Show less"
            : `Show all ${comments.length} comments`}
        </button>
      )}
    </section>
  );
}

const VISIBLE_COMMENTS_LIMIT = 5;

function formatCommentDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
