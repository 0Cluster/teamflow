import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteActivitiesByProject } from "../../activity/activity.repository.js";
import { deleteCommentsByProject } from "../../comments/comment.repository.js";
import { deleteTasksByProject } from "../../tasks/task.repository.js";
import {
  deleteProject,
  findProjectByOrganizationAndId,
} from "../project.repository.js";
import { deleteProjectForOrganization } from "../project.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembershipsByUser: vi.fn(),
  findUserIdsByOrganization: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../activity/activity.repository.js", () => ({
  deleteActivitiesByProject: vi.fn(),
}));

vi.mock("../../activity/activity.service.js", () => ({
  logActivity: vi.fn(),
}));

vi.mock("../../comments/comment.repository.js", () => ({
  deleteCommentsByProject: vi.fn(),
}));

vi.mock("../../tasks/task.repository.js", () => ({
  deleteTasksByProject: vi.fn(),
}));

vi.mock("../project.repository.js", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  findProjectByOrganizationAndId: vi.fn(),
  findProjectsByOrganization: vi.fn(),
  findProjectsByOrganizationIds: vi.fn(),
  findProjectsByIds: vi.fn(),
  updateProject: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteProjectForOrganization cascade", () => {
  it("deletes comments, activities, and tasks before the project", async () => {
    vi.mocked(findProjectByOrganizationAndId).mockResolvedValue({
      id: "proj1",
    } as never);

    const order: string[] = [];
    vi.mocked(deleteCommentsByProject).mockImplementation(async () => {
      order.push("comments");
    });
    vi.mocked(deleteActivitiesByProject).mockImplementation(async () => {
      order.push("activities");
    });
    vi.mocked(deleteTasksByProject).mockImplementation(async () => {
      order.push("tasks");
    });
    vi.mocked(deleteProject).mockImplementation(async () => {
      order.push("project");
    });

    await deleteProjectForOrganization("org1", "proj1", "owner1");

    expect(deleteCommentsByProject).toHaveBeenCalledWith("org1", "proj1");
    expect(deleteActivitiesByProject).toHaveBeenCalledWith("org1", "proj1");
    expect(deleteTasksByProject).toHaveBeenCalledWith("org1", "proj1");
    expect(deleteProject).toHaveBeenCalledWith("org1", "proj1");
    expect(order[order.length - 1]).toBe("project");
  });

  it("throws 404 without deleting when project is missing", async () => {
    vi.mocked(findProjectByOrganizationAndId).mockResolvedValue(null);

    await expect(
      deleteProjectForOrganization("org1", "missing", "owner1"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(deleteProject).not.toHaveBeenCalled();
    expect(deleteTasksByProject).not.toHaveBeenCalled();
  });
});
