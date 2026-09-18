import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProject,
  deleteProject,
  findProjectByOrganizationAndId,
  updateProject,
} from "../project.repository.js";
import {
  emitProjectCreated,
  emitProjectDeleted,
  emitProjectUpdated,
} from "../../../socket/socket.events.js";
import {
  createProjectForOrganization,
  deleteProjectForOrganization,
  updateProjectForOrganization,
} from "../project.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembershipsByUser: vi.fn(),
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

vi.mock("../../../socket/socket.events.js", () => ({
  emitProjectCreated: vi.fn(),
  emitProjectUpdated: vi.fn(),
  emitProjectDeleted: vi.fn(),
}));

vi.mock("../project.repository.js", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  findProjectByOrganizationAndId: vi.fn(),
  findProjectsByOrganization: vi.fn(),
  findProjectsByOrganizationIds: vi.fn(),
  findProjectsByIds: vi.fn(),
  updateProject: vi.fn(),
  deleteProjectsByOrganization: vi.fn(),
}));

function projectDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "proj1",
    organizationId: { toString: () => "org1" },
    name: "API",
    key: "API",
    description: "",
    createdBy: { toString: () => "owner1" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("project realtime events", () => {
  it("emits project:created on create", async () => {
    vi.mocked(createProject).mockResolvedValue(projectDoc() as never);

    await createProjectForOrganization("org1", "owner1", {
      name: "API",
      key: "API",
    });

    expect(emitProjectCreated).toHaveBeenCalledWith(
      "org1",
      expect.objectContaining({ id: "proj1", key: "API" }),
    );
  });

  it("emits project:updated on update", async () => {
    vi.mocked(updateProject).mockResolvedValue(projectDoc() as never);

    await updateProjectForOrganization("org1", "proj1", {
      name: "API v2",
    });

    expect(emitProjectUpdated).toHaveBeenCalledWith(
      "org1",
      expect.objectContaining({ id: "proj1" }),
    );
  });

  it("emits project:deleted on delete", async () => {
    vi.mocked(findProjectByOrganizationAndId).mockResolvedValue(
      projectDoc() as never,
    );

    await deleteProjectForOrganization("org1", "proj1", "owner1");

    expect(emitProjectDeleted).toHaveBeenCalledWith("org1", "proj1");
    expect(deleteProject).toHaveBeenCalledWith("org1", "proj1");
  });
});
