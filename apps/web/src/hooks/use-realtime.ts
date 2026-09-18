import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { socket } from "../lib/socket.js";
import { useAuth } from "../features/auth/use-auth.js";

/*
 * Connects the authenticated socket and keeps notification
 * state fresh in real time.
 *
 * The server auto-joins each connection to its `user:{id}`
 * room, so `notification:new` arrives with no room joins.
 * Task/comment/activity events require explicit room joins
 * and are intentionally left to page-level hooks.
 */
export function useRealtime() {
  const { accessToken, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      socket.disconnect();

      return;
    }

    socket.auth = { token: accessToken };
    socket.connect();

    const handleNotification = () => {
      void queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    };

    socket.on("notification:new", handleNotification);

    return () => {
      socket.off("notification:new", handleNotification);
      socket.disconnect();
    };
  }, [isAuthenticated, accessToken, queryClient]);
}
