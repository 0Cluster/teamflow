import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "../lib/socket.js";
import { useOrganizationRoom } from "./use-live-activity.js";

export function useJoinOrganizations(organizationIds: string[]) {
  const idsRef = useRef<string[]>([]);
  idsRef.current = organizationIds;

  const cacheKey = [...organizationIds].sort().join(",");

  useEffect(() => {
    const ids = idsRef.current;

    if (ids.length === 0) {
      return;
    }

    const join = () => {
      for (const id of ids) {
        socket.emit("organization:join", id);
      }
    };

    if (socket.connected) {
      join();
    }

    socket.on("connect", join);

    return () => {
      socket.off("connect", join);

      for (const id of ids) {
        socket.emit("organization:leave", id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);
}

/*
 * Live-updates an organization-scoped project list plus the
 * global "my projects" list. Any project event in the org room
 * triggers both — payloads are ignored in favor of REST.
 */
export function useLiveProjects(
  organizationId: string | undefined,
) {
  useOrganizationRoom(organizationId);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const handleProject = () => {
      void queryClient.invalidateQueries({
        queryKey: ["organization-projects", organizationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["my-projects"],
      });
    };

    socket.on("project:created", handleProject);
    socket.on("project:updated", handleProject);
    socket.on("project:deleted", handleProject);

    return () => {
      socket.off("project:created", handleProject);
      socket.off("project:updated", handleProject);
      socket.off("project:deleted", handleProject);
    };
  }, [queryClient, organizationId]);
}

/*
 * Live-updates the global project list across every org room.
 */
export function useLiveMyProjects(organizationIds: string[]) {
  useJoinOrganizations(organizationIds);

  const queryClient = useQueryClient();

  useEffect(() => {
    const handleProject = () => {
      void queryClient.invalidateQueries({
        queryKey: ["my-projects"],
      });
    };

    socket.on("project:created", handleProject);
    socket.on("project:updated", handleProject);
    socket.on("project:deleted", handleProject);

    return () => {
      socket.off("project:created", handleProject);
      socket.off("project:updated", handleProject);
      socket.off("project:deleted", handleProject);
    };
  }, [queryClient]);
}

/*
 * Live-updates the member list on the organization page.
 */
export function useLiveMembers(
  organizationId: string | undefined,
) {
  useOrganizationRoom(organizationId);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const handleMember = () => {
      void queryClient.invalidateQueries({
        queryKey: ["organizations", organizationId, "members"],
      });
    };

    socket.on("member:added", handleMember);
    socket.on("member:updated", handleMember);
    socket.on("member:removed", handleMember);

    return () => {
      socket.off("member:added", handleMember);
      socket.off("member:updated", handleMember);
      socket.off("member:removed", handleMember);
    };
  }, [queryClient, organizationId]);
}
