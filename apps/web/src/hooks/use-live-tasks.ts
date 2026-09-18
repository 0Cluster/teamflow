import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "../lib/socket.js";
import { useOrganizationRoom } from "./use-live-activity.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function payloadProjectId(payload: unknown): string | null {
  if (
    isRecord(payload) &&
    "projectId" in payload &&
    payload.projectId != null
  ) {
    return String(payload.projectId);
  }

  return null;
}

function payloadTaskId(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if ("id" in payload && payload.id != null) {
    return String(payload.id);
  }

  if ("taskId" in payload && payload.taskId != null) {
    return String(payload.taskId);
  }

  return null;
}

interface LiveTasksOptions {
  organizationId: string | undefined;
  projectId: string | undefined;
  taskId?: string;
  onTaskDeleted?: (taskId: string) => void;
}

/*
 * Live-updates the Kanban board, task detail, and comment thread.
 *
 * All task/comment events fan out to `organization:{id}`, so one
 * room join covers everything; payloads are only used to scope
 * invalidations (and to detect our own task being deleted).
 * Authoritative state always comes from REST refetches.
 */
export function useLiveTasks({
  organizationId,
  projectId,
  taskId,
  onTaskDeleted,
}: LiveTasksOptions) {
  useOrganizationRoom(organizationId);

  const queryClient = useQueryClient();
  const deletedRef = useRef(onTaskDeleted);
  deletedRef.current = onTaskDeleted;

  useEffect(() => {
    if (!organizationId || !projectId) {
      return;
    }

    const boardKey = ["project-tasks", organizationId, projectId];
    const detailKey =
      taskId !== undefined
        ? ["task", organizationId, projectId, taskId]
        : null;
    const commentsKey =
      taskId !== undefined
        ? ["task-comments", organizationId, projectId, taskId]
        : null;

    const invalidateBoard = () => {
      void queryClient.invalidateQueries({
        queryKey: boardKey,
      });
    };

    const forThisProject = (payload: unknown): boolean => {
      const eventProjectId = payloadProjectId(payload);

      return (
        eventProjectId === null || eventProjectId === projectId
      );
    };

    const handleTaskMutated = (payload: unknown) => {
      if (!forThisProject(payload)) {
        return;
      }

      invalidateBoard();

      const eventTaskId = payloadTaskId(payload);

      if (
        detailKey !== null &&
        eventTaskId !== null &&
        eventTaskId === taskId
      ) {
        void queryClient.invalidateQueries({
          queryKey: detailKey,
        });
      }
    };

    const handleTaskDeleted = (payload: unknown) => {
      invalidateBoard();

      const eventTaskId = payloadTaskId(payload);

      if (
        eventTaskId !== null &&
        eventTaskId === taskId
      ) {
        deletedRef.current?.(eventTaskId);
      }
    };

    const handleCommentMutated = (payload: unknown) => {
      if (commentsKey === null || !forThisProject(payload)) {
        return;
      }

      const eventTaskId = payloadTaskId(payload);

      if (eventTaskId === null || eventTaskId === taskId) {
        void queryClient.invalidateQueries({
          queryKey: commentsKey,
        });
      }
    };

    socket.on("task:created", handleTaskMutated);
    socket.on("task:updated", handleTaskMutated);
    socket.on("task:deleted", handleTaskDeleted);
    socket.on("comment:created", handleCommentMutated);
    socket.on("comment:updated", handleCommentMutated);
    socket.on("comment:deleted", handleCommentMutated);

    return () => {
      socket.off("task:created", handleTaskMutated);
      socket.off("task:updated", handleTaskMutated);
      socket.off("task:deleted", handleTaskDeleted);
      socket.off("comment:created", handleCommentMutated);
      socket.off("comment:updated", handleCommentMutated);
      socket.off("comment:deleted", handleCommentMutated);
    };
  }, [queryClient, organizationId, projectId, taskId]);
}
