import type { Socket } from "socket.io";
import { findProjectById } from "../modules/projects/project.repository.js";
import { findMembership } from "../modules/memberships/membership.repository.js";
import { findTaskByIdForSocket } from "../modules/tasks/task.repository.js";

export function organizationRoom(organizationId: string): string {
  return `organization:${organizationId}`;
}

export function projectRoom(projectId: string): string {
  return `project:${projectId}`;
}

export function taskRoom(taskId: string): string {
  return `task:${taskId}`;
}

export async function joinOrganizationRoom(
  socket: Socket,
  organizationId: string,
): Promise<boolean> {
  const authenticatedSocket = socket as Socket & {
    user: {
      id: string;
    };
  };

  const membership = await findMembership(
    organizationId,
    authenticatedSocket.user.id,
  );

  if (!membership) {
    return false;
  }

  await socket.join(organizationRoom(organizationId));

  return true;
}

export async function leaveOrganizationRoom(
  socket: Socket,
  organizationId: string,
): Promise<void> {
  await socket.leave(organizationRoom(organizationId));
}

export async function joinProjectRoom(
  socket: Socket,
  projectId: string,
): Promise<boolean> {
  const authenticatedSocket = socket as Socket & {
    user: {
      id: string;
    };
  };

  const project = await findProjectById(projectId);

  if (!project) {
    return false;
  }

  const membership = await findMembership(
    project.organizationId.toString(),
    authenticatedSocket.user.id,
  );

  if (!membership) {
    return false;
  }

  await socket.join(projectRoom(projectId));

  return true;
}

export async function leaveProjectRoom(
  socket: Socket,
  projectId: string,
): Promise<void> {
  await socket.leave(projectRoom(projectId));
}

export async function joinTaskRoom(
  socket: Socket,
  taskId: string,
): Promise<boolean> {
  const authenticatedSocket = socket as Socket & {
    user: {
      id: string;
    };
  };

const task = await findTaskByIdForSocket(taskId);

  if (!task) {
    return false;
  }

  const project = await findProjectById(
    task.projectId.toString(),
  );

  if (!project) {
    return false;
  }

  const membership = await findMembership(
    project.organizationId.toString(),
    authenticatedSocket.user.id,
  );

  if (!membership) {
    return false;
  }

  await socket.join(taskRoom(taskId));

  return true;
}

export async function leaveTaskRoom(
  socket: Socket,
  taskId: string,
): Promise<void> {
  await socket.leave(taskRoom(taskId));
}
