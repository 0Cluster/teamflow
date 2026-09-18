import { beforeEach, describe, expect, it, vi } from "vitest";

import { findMembershipsByUser } from "../../memberships/membership.repository.js";
import { findProjectsByOrganizationIds } from "../project.repository.js";
import { listProjectsForUser } from "../project.service.js";

vi.mock("../../memberships/membership.repository.js", () => ({
  findMembershipsByUser: vi.fn(),
}));

vi.mock("../project.repository.js", () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  findProjectByOrganizationAndId: vi.fn(),
  findProjectsByOrganization: vi.fn(),
  findProjectsByOrganizationIds: vi.fn(),
  updateProject: vi.fn(),
}));

const findMembershipsMock = vi.mocked(findMembershipsByUser);
const findProjectsMock = vi.mocked(findProjectsByOrganizationIds);

function projectDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    organizationId: { toString: () => "org1" },
    name: "API",
    key: "API",
    description: "",
    createdBy: { toString: () => "user1" },
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listProjectsForUser", () => {
  it("returns empty without querying projects when user has no memberships", async () => {
    findMembershipsMock.mockResolvedValue([]);

    const result = await listProjectsForUser("user1");

    expect(result).toEqual([]);
    expect(findProjectsMock).not.toHaveBeenCalled();
  });

  it("queries only member organizations and maps DTO", async () => {
    findMembershipsMock.mockResolvedValue([
      { organizationId: "org1" },
      { organizationId: { _id: "org2" } },
      { organizationId: "org1" },
    ] as never);

    findProjectsMock.mockResolvedValue([
      projectDoc(),
      projectDoc({
        id: "p2",
        organizationId: { toString: () => "org2" },
      }),
    ] as never);

    const result = await listProjectsForUser("user1");

    expect(findProjectsMock).toHaveBeenCalledWith(["org1", "org2"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "p1",
      organizationId: "org1",
    });
  });
});
