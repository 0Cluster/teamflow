import { beforeEach, describe, expect, it, vi } from "vitest";

import { findMembershipsByUser } from "../../memberships/membership.repository.js";
import { findProjectsByIds } from "../../projects/project.repository.js";
import {
  findTasksAssignedToUser,
} from "../task.repository.js";
import { listMyTasks } from "../task.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembership: vi.fn(),
  findMembershipsByUser: vi.fn(),
}));

vi.mock("../task.repository.js", () => ({
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  findLastTaskNumber: vi.fn(),
  findTaskById: vi.fn(),
  findTasksAssignedToUser: vi.fn(),
  findTasksByProject: vi.fn(),
  updateTask: vi.fn(),
  addLabelToTask: vi.fn(),
  removeLabelFromTask: vi.fn(),
}));

vi.mock("../../projects/project.repository.js", () => ({
  findProjectByOrganizationAndId: vi.fn(),
  findProjectsByIds: vi.fn(),
}));

vi.mock("../../labels/label.repository.js", () => ({
  findLabelById: vi.fn(),
  findLabelsByIds: vi.fn(),
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

const findMembershipsMock = vi.mocked(findMembershipsByUser);
const findTasksMock = vi.mocked(findTasksAssignedToUser);
const findProjectsMock = vi.mocked(findProjectsByIds);

function taskDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    organizationId: { toString: () => "org1" },
    projectId: { toString: () => "proj1" },
    number: 1,
    title: "Task",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    assigneeId: { toString: () => "user1" },
    labelIds: [],
    createdBy: { toString: () => "user1" },
    dueDate: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    ...overrides,
  };
}

const baseQuery = {
  page: 1,
  limit: 20,
  sortBy: "createdAt" as const,
  sortOrder: "desc" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listMyTasks", () => {
  it("returns empty pagination without querying when user has no memberships", async () => {
    findMembershipsMock.mockResolvedValue([]);

    const result = await listMyTasks("user1", baseQuery);

    expect(result.tasks).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(findTasksMock).not.toHaveBeenCalled();
  });

  it("scopes tasks to member orgs and resolves project identifiers", async () => {
    findMembershipsMock.mockResolvedValue([
      { organizationId: "org1" },
    ] as never);

    findTasksMock.mockResolvedValue({
      tasks: [taskDoc()],
      total: 1,
    } as never);

    findProjectsMock.mockResolvedValue([
      { id: "proj1", key: "API" },
    ] as never);

    const result = await listMyTasks("user1", baseQuery);

    expect(findTasksMock).toHaveBeenCalledWith("user1", ["org1"], baseQuery);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      organizationId: "org1",
      projectId: "proj1",
      identifier: "API-1",
    });
    expect(result.pagination.total).toBe(1);
  });
});
