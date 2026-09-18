import { beforeEach, describe, expect, it, vi } from "vitest";

import { findMembership } from "../membership.repository.js";
import { deleteMembership } from "../membership.repository.js";
import { findUserById } from "../../users/user.repository.js";
import { logActivity } from "../../activity/activity.service.js";
import { emitMemberRemoved } from "../../../socket/socket.events.js";
import { leaveOrganizationForUser } from "../membership.service.js";

vi.mock("../../users/user.repository.js", () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

vi.mock("../membership.repository.js", () => ({
  createMembership: vi.fn(),
  deleteMembership: vi.fn(),
  findMembership: vi.fn(),
  findMembershipsByOrganization: vi.fn(),
  updateMembershipRole: vi.fn(),
  deleteMembershipsByOrganization: vi.fn(),
}));

vi.mock("../../organizations/organization.repository.js", () => ({
  updateOrganizationOwner: vi.fn(),
  findOrganizationById: vi.fn(),
  deleteOrganization: vi.fn(),
}));

vi.mock("../../notifications/notification.service.js", () => ({
  notifyMemberAdded: vi.fn(),
  notifyMemberRoleChanged: vi.fn(),
  notifyOwnershipTransferred: vi.fn(),
}));

vi.mock("../../activity/activity.service.js", () => ({
  logActivity: vi.fn(),
}));

vi.mock("../../../socket/socket.events.js", () => ({
  emitMemberAdded: vi.fn(),
  emitMemberUpdated: vi.fn(),
  emitMemberRemoved: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("leaveOrganizationForUser", () => {
  it("removes the membership and logs the leave with a name", async () => {
    vi.mocked(findMembership).mockResolvedValue({
      role: "MEMBER",
    } as never);
    vi.mocked(findUserById).mockResolvedValue({
      id: "user1",
      name: "Leaver",
    } as never);

    await leaveOrganizationForUser("org1", "user1");

    expect(deleteMembership).toHaveBeenCalledWith("org1", "user1");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBER_REMOVED",
        actorId: "user1",
        metadata: expect.objectContaining({
          memberName: "Leaver",
          selfLeave: true,
        }),
      }),
    );
    expect(emitMemberRemoved).toHaveBeenCalledWith("org1", {
      userId: "user1",
    });
  });

  it("blocks the owner from leaving", async () => {
    vi.mocked(findMembership).mockResolvedValue({
      role: "OWNER",
    } as never);

    await expect(
      leaveOrganizationForUser("org1", "owner1"),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(deleteMembership).not.toHaveBeenCalled();
  });

  it("throws 404 for non-members", async () => {
    vi.mocked(findMembership).mockResolvedValue(null);

    await expect(
      leaveOrganizationForUser("org1", "stranger"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(deleteMembership).not.toHaveBeenCalled();
  });
});
