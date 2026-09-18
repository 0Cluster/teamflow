import { beforeEach, describe, expect, it, vi } from "vitest";

import { findMembershipsByUser } from "../../memberships/membership.repository.js";
import {
  findProjectsByOrganizationIds,
} from "../project.repository.js";
import { cacheDel, cacheGet, cacheSet } from "../../../common/cache/cache.js";
import {
  createProjectForOrganization,
  invalidateMyProjects,
  listProjectsForUser,
  myProjectsCacheKey,
} from "../project.service.js";
import { createProject } from "../project.repository.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembershipsByUser: vi.fn(),
  findUserIdsByOrganization: vi.fn().mockResolvedValue([]),
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

vi.mock("../../../common/cache/cache.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
}));

vi.mock("../../activity/activity.service.js", () => ({
  logActivity: vi.fn(),
}));

vi.mock("../../../socket/socket.events.js", () => ({
  emitProjectCreated: vi.fn(),
  emitProjectUpdated: vi.fn(),
  emitProjectDeleted: vi.fn(),
}));

function projectDoc() {
  return {
    id: "p1",
    organizationId: { toString: () => "org1" },
    name: "API",
    key: "API",
    description: "",
    createdBy: { toString: () => "user1" },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("my-projects cache", () => {
  it("serves repeated reads from cache", async () => {
    vi.mocked(findMembershipsByUser).mockResolvedValue([
      { organizationId: "org1" },
    ] as never);
    vi.mocked(findProjectsByOrganizationIds).mockResolvedValue([
      projectDoc(),
    ] as never);
    vi.mocked(cacheGet).mockResolvedValue(null);

    const first = await listProjectsForUser("user1");

    expect(first).toHaveLength(1);
    expect(findProjectsByOrganizationIds).toHaveBeenCalledTimes(1);
    expect(cacheSet).toHaveBeenCalledWith(
      myProjectsCacheKey("user1"),
      expect.anything(),
      60,
    );

    vi.mocked(cacheGet).mockResolvedValue(first as never);

    const second = await listProjectsForUser("user1");

    expect(second).toEqual(first);
    expect(findProjectsByOrganizationIds).toHaveBeenCalledTimes(1);
  });

  it("invalidates the actor org on project create", async () => {
    vi.mocked(createProject).mockResolvedValue(projectDoc() as never);

    await createProjectForOrganization("org1", "owner1", {
      name: "API",
      key: "API",
    });

    expect(cacheDel).toHaveBeenCalled();
  });

  it("invalidates explicit user lists", async () => {
    await invalidateMyProjects(["a", "b"]);

    expect(cacheDel).toHaveBeenCalledWith([
      myProjectsCacheKey("a"),
      myProjectsCacheKey("b"),
    ]);
  });
});
