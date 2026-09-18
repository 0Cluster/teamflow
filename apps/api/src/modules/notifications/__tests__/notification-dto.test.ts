import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  countNotificationsByUser,
  countUnreadNotificationsByUser,
  createNotification,
  findNotificationsByUser,
} from "../notification.repository.js";
import {
  getNotificationsForUser,
  notifyMemberAdded,
  notifyMemberRoleChanged,
  notifyOwnershipTransferred,
  toNotificationDTO,
} from "../notification.service.js";

vi.mock("../notification.repository.js", () => ({
  countNotificationsByUser: vi.fn(),
  countUnreadNotificationsByUser: vi.fn(),
  createNotification: vi.fn(),
  findNotificationById: vi.fn(),
  findNotificationsByUser: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markNotificationAsRead: vi.fn(),
}));

vi.mock("../../socket/socket.events.js", () => ({
  emitNotification: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toNotificationDTO", () => {
  it("maps populated refs to the frontend contract", () => {
    const dto = toNotificationDTO({
      _id: "notif1",
      userId: "user1",
      organizationId: "org1",
      projectId: { _id: "proj1", name: "API", key: "API" },
      taskId: { _id: "task1", number: 7, title: "Fix bug" },
      actorId: { _id: "user2", name: "Ann", email: "ann@x.com" },
      type: "TASK_ASSIGNED",
      title: "Task assigned to you",
      message: "msg",
      isRead: false,
      metadata: {},
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });

    expect(dto).toMatchObject({
      id: "notif1",
      userId: "user1",
      organizationId: "org1",
      projectId: "proj1",
      taskId: "task1",
      actorId: "user2",
      actor: { id: "user2", name: "Ann", email: "ann@x.com" },
      project: { id: "proj1", name: "API", key: "API" },
      task: { id: "task1", number: 7, title: "Fix bug" },
    });
  });

  it("keeps unpopulated ObjectIds as flat id strings", () => {
    const dto = toNotificationDTO({
      _id: "notif1",
      userId: "user1",
      organizationId: "org1",
      projectId: "proj1",
      taskId: null,
      actorId: null,
      type: "MEMBER_ADDED",
      title: "Added",
      message: "msg",
      isRead: true,
    });

    expect(dto).toMatchObject({
      id: "notif1",
      projectId: "proj1",
      taskId: null,
      actorId: null,
    });
    expect(dto).not.toHaveProperty("actor");
    expect(dto).not.toHaveProperty("project");
    expect(dto).not.toHaveProperty("task");
  });
});

describe("getNotificationsForUser", () => {
  it("returns mapped notifications with pagination", async () => {
    vi.mocked(findNotificationsByUser).mockResolvedValue([
      {
        _id: "n1",
        userId: "u1",
        organizationId: "o1",
        type: "TASK_ASSIGNED",
        title: "t",
        message: "m",
        isRead: false,
      },
    ] as never);
    vi.mocked(countNotificationsByUser).mockResolvedValue(1);
    vi.mocked(countUnreadNotificationsByUser).mockResolvedValue(1);

    const result = await getNotificationsForUser("u1", 1, 20, false);

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({ id: "n1" });
    expect(result.unreadCount).toBe(1);
  });
});

describe("member notification helpers", () => {
  const base = {
    userId: "newbie",
    organizationId: "org1",
    orgName: "Acme",
    actorId: "owner1",
  };

  it("creates a MEMBER_ADDED notification", async () => {
    await notifyMemberAdded(base);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "newbie",
        type: "MEMBER_ADDED",
        actorId: "owner1",
      }),
    );
  });

  it("creates a MEMBER_ROLE_CHANGED notification with the role", async () => {
    await notifyMemberRoleChanged({ ...base, role: "ADMIN" });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBER_ROLE_CHANGED",
        metadata: { role: "ADMIN" },
      }),
    );
  });

  it("creates an OWNERSHIP_TRANSFERRED notification", async () => {
    await notifyOwnershipTransferred(base);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "OWNERSHIP_TRANSFERRED" }),
    );
  });

  it("skips self-notifications", async () => {
    const self = { ...base, userId: "owner1" };

    await expect(notifyMemberAdded(self)).resolves.toBeNull();
    await expect(
      notifyMemberRoleChanged({ ...self, role: "ADMIN" }),
    ).resolves.toBeNull();
    await expect(notifyOwnershipTransferred(self)).resolves.toBeNull();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
