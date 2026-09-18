import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findMembership,
  deleteMembershipsByOrganization,
} from "../../memberships/membership.repository.js";
import { deleteActivitiesByOrganization } from "../../activity/activity.repository.js";
import { deleteCommentsByOrganization } from "../../comments/comment.repository.js";
import { deleteLabelsByOrganization } from "../../labels/label.repository.js";
import { deleteTasksByOrganization } from "../../tasks/task.repository.js";
import { deleteProjectsByOrganization } from "../../projects/project.repository.js";
import {
  deleteOrganization,
  findOrganizationById,
} from "../organization.repository.js";
import { deleteOrganizationForUser } from "../organization.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembership: vi.fn(),
  findMembershipsByUser: vi.fn(),
  createMembership: vi.fn(),
  deleteMembershipsByOrganization: vi.fn(),
}));

vi.mock("../../activity/activity.repository.js", () => ({
  deleteActivitiesByOrganization: vi.fn(),
}));

vi.mock("../../comments/comment.repository.js", () => ({
  deleteCommentsByOrganization: vi.fn(),
}));

vi.mock("../../labels/label.repository.js", () => ({
  deleteLabelsByOrganization: vi.fn(),
}));

vi.mock("../../tasks/task.repository.js", () => ({
  deleteTasksByOrganization: vi.fn(),
}));

vi.mock("../../projects/project.repository.js", () => ({
  deleteProjectsByOrganization: vi.fn(),
}));

vi.mock("../organization.repository.js", () => ({
  createOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  findOrganizationById: vi.fn(),
  findOrganizationBySlug: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteOrganizationForUser", () => {
  it("cascades all org data before deleting the organization", async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: "org1",
    } as never);
    vi.mocked(findMembership).mockResolvedValue({
      role: "OWNER",
    } as never);

    const order: string[] = [];
    vi.mocked(deleteCommentsByOrganization).mockImplementation(async () => {
      order.push("comments");
    });
    vi.mocked(deleteActivitiesByOrganization).mockImplementation(async () => {
      order.push("activities");
    });
    vi.mocked(deleteTasksByOrganization).mockImplementation(async () => {
      order.push("tasks");
    });
    vi.mocked(deleteProjectsByOrganization).mockImplementation(async () => {
      order.push("projects");
    });
    vi.mocked(deleteLabelsByOrganization).mockImplementation(async () => {
      order.push("labels");
    });
    vi.mocked(deleteMembershipsByOrganization).mockImplementation(async () => {
      order.push("memberships");
    });
    vi.mocked(deleteOrganization).mockImplementation(async () => {
      order.push("organization");
    });

    await deleteOrganizationForUser("org1", "user1");

    expect(deleteCommentsByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteActivitiesByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteTasksByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteProjectsByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteLabelsByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteMembershipsByOrganization).toHaveBeenCalledWith("org1");
    expect(deleteOrganization).toHaveBeenCalledWith("org1");
    expect(order[order.length - 1]).toBe("organization");
  });

  it("throws 403 without deleting when actor is not the owner", async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({
      id: "org1",
    } as never);
    vi.mocked(findMembership).mockResolvedValue({
      role: "ADMIN",
    } as never);

    await expect(
      deleteOrganizationForUser("org1", "user1"),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(deleteOrganization).not.toHaveBeenCalled();
    expect(deleteProjectsByOrganization).not.toHaveBeenCalled();
  });

  it("throws 404 without deleting when organization is missing", async () => {
    vi.mocked(findOrganizationById).mockResolvedValue(null);

    await expect(
      deleteOrganizationForUser("org1", "user1"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(deleteOrganization).not.toHaveBeenCalled();
  });
});
