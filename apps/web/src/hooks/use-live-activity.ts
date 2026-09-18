import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "../lib/socket.js";

/*
 * Joins an organization's socket room for the lifetime of the
 * mounting component. The server re-checks membership on join,
 * so a forged organizationId simply gets rejected.
 *
 * The socket may not be connected yet (the global realtime hook
 * connects on mount too) — socket.io buffers the join until the
 * connection is up, and we re-join on reconnects.
 */
export function useOrganizationRoom(
  organizationId: string | undefined,
) {
  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const join = () => {
      socket.emit("organization:join", organizationId);
    };

    if (socket.connected) {
      join();
    }

    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
      socket.emit("organization:leave", organizationId);
    };
  }, [organizationId]);
}

/*
 * Live-updates a react-query activity feed: joins the org room
 * (all activity events fan out to `organization:{id}`) and
 * invalidates the feed whenever `activity:new` arrives.
 * The payload itself is ignored — the feed re-fetches
 * authoritative, normalized state over REST.
 */
export function useLiveActivity(
  organizationId: string | undefined,
  queryKey: unknown[],
) {
  useOrganizationRoom(organizationId);

  const queryClient = useQueryClient();
  const cacheKey = JSON.stringify(queryKey);

  useEffect(() => {
    const key = JSON.parse(cacheKey) as unknown[];

    const handleActivity = () => {
      void queryClient.invalidateQueries({
        queryKey: key,
      });
    };

    socket.on("activity:new", handleActivity);

    return () => {
      socket.off("activity:new", handleActivity);
    };
  }, [queryClient, organizationId, cacheKey]);
}
