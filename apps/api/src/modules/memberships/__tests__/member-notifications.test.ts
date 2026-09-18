import { beforeEach, describe, expect, it, vi } from "vitest";

import { findUserByEmail, findUserById } from "../../users/user.repository.js";
import {
  createMembership,
  findMembership,
} from "../membership.repository.js";
import { findOrganizationById } from "../../organizations/organization.repository.js";
import {
  notifyMemberAdded,
  notifyMemberRoleChanged,
  notifyOwnershipTransferred,
} from "../../notifications/notification.service.js";
import {
  emitMemberAdded,
  emitMemberUpdated,
} from "../../../socket/socket.events.js";
import { logActivity } from "../../activity/activity.service.js";
import {
  addMemberToOrganization,
  changeMemberRole,
} from "../membership.service.js";

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

describe("membership notifications", () => {
  it("notifies the new member and emits member:added", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({
      id: "newbie",
      name: "New",
      email: "new@x.com",
    } as never);
    vi.mocked(findMembership).mockResolvedValue(null);
    vi.mocked(createMembership).mockResolvedValue({
      role: "MEMBER",
      createdAt: new Date(),
    } as never);
    vi.mocked(findOrganizationById).mockResolvedValue({
      name: "Acme",
    } as never);

    await addMemberToOrganization(
      "org1",
      { email: "new@x.com", role: "MEMBER" },
      "owner1",
    );

    expect(notifyMemberAdded).toHaveBeenCalledWith({
      userId: "newbie",
      organizationId: "org1",
      orgName: "Acme",
      actorId: "owner1",
    });
    expect(emitMemberAdded).toHaveBeenCalledWith(
      "org1",
      expect.objectContaining({ userId: "newbie" }),
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBER_ADDED",
        metadata: expect.objectContaining({ memberName: "New" }),
      }),
    );
  });

  it("notifies on role change and emits member:updated", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      id: "target1",
      name: "T",
      email: "t@x.com",
    } as never);
    vi.mocked(findMembership).mockResolvedValue({
      role: "MEMBER",
    } as never);
    vi.mocked(findOrganizationById).mockResolvedValue({
      name: "Acme",
    } as never);

    await changeMemberRole("org1", "target1", "owner1", "OWNER", {
      role: "ADMIN",
    });

    expect(notifyMemberRoleChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "target1",
        role: "ADMIN",
      }),
    );
    expect(notifyOwnershipTransferred).not.toHaveBeenCalled();
    expect(emitMemberUpdated).toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBER_ROLE_CHANGED",
        metadata: expect.objectContaining({
          memberName: "T",
          previousRole: "MEMBER",
          role: "ADMIN",
        }),
      }),
    );
  });

  it("notifies ownership transfer instead of a plain role change", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      id: "target1",
      name: "T",
      email: "t@x.com",
    } as never);
    vi.mocked(findMembership).mockResolvedValue({
      role: "ADMIN",
    } as never);
    vi.mocked(findOrganizationById).mockResolvedValue({
      name: "Acme",
    } as never);

    await changeMemberRole("org1", "target1", "owner1", "OWNER", {
      role: "OWNER",
    });

    expect(notifyOwnershipTransferred).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "target1" }),
    );
    expect(notifyMemberRoleChanged).not.toHaveBeenCalled();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "OWNERSHIP_TRANSFERRED",
        metadata: expect.objectContaining({ memberName: "T" }),
      }),
    );
  });
});
