import { beforeEach, describe, expect, it, vi } from "vitest";

import { findMembership } from "../../memberships/membership.repository.js";
import { findProjectByOrganizationAndId } from "../../projects/project.repository.js";
import {
  createTask,
  findLastTaskNumber,
} from "../task.repository.js";
import { notifyTaskAssigned } from "../../notifications/notification.service.js";
import { createTaskForProject } from "../task.service.js";

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

vi.mock("../../notifications/notification.service.js", () => ({
  notifyTaskAssigned: vi.fn(),
  notifyTaskStatusChanged: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function setupValidTask() {
  vi.mocked(findProjectByOrganizationAndId).mockResolvedValue({
    id: "proj1",
    key: "API",
  } as never);
  vi.mocked(findMembership).mockResolvedValue({ role: "MEMBER" } as never);
  vi.mocked(findLastTaskNumber).mockResolvedValue(null);
  vi.mocked(createTask).mockImplementation(async (data: never) => ({
    id: "task1",
    number: 1,
    status: "TODO",
    priority: "MEDIUM",
    description: "",
    dueDate: null,
    labelIds: [],
    createdBy: "creator1",
    ...(data as Record<string, unknown>),
    projectId: { toString: () => "proj1" },
    assigneeId:
      (data as { assigneeId?: string }).assigneeId !== undefined
        ? { toString: () => (data as { assigneeId: string }).assigneeId }
        : null,
  }));
}

describe("createTaskForProject assignee", () => {
  it("persists the assignee and notifies them", async () => {
    setupValidTask();

    const task = await createTaskForProject("org1", "proj1", "creator1", {
      title: "Do it",
      priority: "MEDIUM",
      assigneeId: "assignee1",
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: "assignee1" }),
    );
    expect(task.assigneeId).toBe("assignee1");
    expect(notifyTaskAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "assignee1",
        actorId: "creator1",
      }),
    );
  });

  it("does not notify when the task is unassigned", async () => {
    setupValidTask();

    const task = await createTaskForProject("org1", "proj1", "creator1", {
      title: "Do it",
      priority: "MEDIUM",
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.not.objectContaining({ assigneeId: expect.anything() }),
    );
    expect(task.assigneeId).toBeNull();
    expect(notifyTaskAssigned).not.toHaveBeenCalled();
  });

  it("rejects an assignee outside the organization", async () => {
    setupValidTask();
    vi.mocked(findMembership).mockResolvedValue(null);

    await expect(
      createTaskForProject("org1", "proj1", "creator1", {
        title: "Do it",
        priority: "MEDIUM",
        assigneeId: "outsider",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(createTask).not.toHaveBeenCalled();
  });
});
