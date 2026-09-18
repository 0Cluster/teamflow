/*
 * Client-side mirror of the server socket event contracts
 * (apps/api/src/socket/socket.types.ts).
 *
 * Payloads stay loose (`unknown`) so the socket layer never
 * blocks page rendering on a shape mismatch — pages re-fetch
 * authoritative state via react-query instead.
 */

export interface ServerToClientEvents {
  "task:created": (task: unknown) => void;
  "task:updated": (task: unknown) => void;
  "task:deleted": (payload: unknown) => void;

  "comment:created": (comment: unknown) => void;
  "comment:updated": (comment: unknown) => void;
  "comment:deleted": (payload: unknown) => void;

  "notification:new": (notification: unknown) => void;

  "project:created": (project: unknown) => void;
  "project:updated": (project: unknown) => void;
  "project:deleted": (payload: unknown) => void;

  "activity:new": (activity: unknown) => void;

  "member:added": (membership: unknown) => void;
  "member:updated": (membership: unknown) => void;
  "member:removed": (membership: unknown) => void;
}

export interface ClientToServerEvents {
  "organization:join": (
    organizationId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;

  "organization:leave": (
    organizationId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;

  "project:join": (
    projectId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;

  "project:leave": (
    projectId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;

  "task:join": (
    taskId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;

  "task:leave": (
    taskId: string,
    callback?: (response: {
      success: boolean;
      message?: string;
    }) => void,
  ) => void;
}
