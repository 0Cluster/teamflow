import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteActivitiesByTask } from "../../activity/activity.repository.js";
import { deleteCommentsByTask } from "../../comments/comment.repository.js";
import {
  deleteTask,
  findTaskById,
} from "../task.repository.js";
import { deleteTaskForProject } from "../task.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembership: vi.fn(),
  findMembershipsByUser: vi.fn(),
}));

vi.mock("../../projects/project.repository.js", () => ({
  findProjectByOrganizationAndId: vi.fn(),
  findProjectsByIds: vi.fn(),
}));

vi.mock("../../labels/label.repository.js", () => ({
  findLabelById: vi.fn(),
  findLabelsByIds: vi.fn(),
}));

vi.mock("../../comments/comment.repository.js", () => ({
  deleteCommentsByTask: vi.fn(),
}));

vi.mock("../../activity/activity.repository.js", () => ({
  deleteActivitiesByTask: vi.fn(),
}));

vi.mock("../task.repository.js", () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  deleteTasksByProject: vi.fn(),
  findLastTaskNumber: vi.fn(),
  findTaskById: vi.fn(),
  findTasksAssignedToUser: vi.fn(),
  findTasksByProject: vi.fn(),
  updateTask: vi.fn(),
  addLabelToTask: vi.fn(),
  removeLabelFromTask: vi.fn(),
}));

vi.mock("../../activity/activity.service.js", () => ({
  logActivity: vi.fn(),
}));

vi.mock("../../socket/socket.events.js", () => ({
  emitTaskCreated: vi.fn(),
  emitTaskUpdated: vi.fn(),
  emitTaskDeleted: vi.fn(),
}));

vi.mock("../notifications/notification.service.js", () => ({
  notifyTaskAssigned: vi.fn(),
  notifyTaskStatusChanged: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteTaskForProject cascade", () => {
  it("deletes comments and activities before the task", async () => {
    vi.mocked(findTaskById).mockResolvedValue({
      id: "t1",
      number: 3,
      title: "Task",
    } as never);

    await deleteTaskForProject("org1", "proj1", "t1", "user1");

    expect(deleteCommentsByTask).toHaveBeenCalledWith("org1", "proj1", "t1");
    expect(deleteActivitiesByTask).toHaveBeenCalledWith("org1", "proj1", "t1");
    expect(deleteTask).toHaveBeenCalledWith("org1", "proj1", "t1");
  });

  it("throws 404 without deleting when task is missing", async () => {
    vi.mocked(findTaskById).mockResolvedValue(null);

    await expect(
      deleteTaskForProject("org1", "proj1", "missing", "user1"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(deleteTask).not.toHaveBeenCalled();
    expect(deleteCommentsByTask).not.toHaveBeenCalled();
  });
});
