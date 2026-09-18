import { beforeEach, describe, expect, it, vi } from "vitest";

import { createActivity } from "../activity.repository.js";
import { emitActivity } from "../../../socket/socket.events.js";
import { logActivity } from "../activity.service.js";

vi.mock("../activity.repository.js", () => ({
  createActivity: vi.fn(),
  findActivitiesByOrganization: vi.fn(),
  findActivitiesByProject: vi.fn(),
  findActivitiesByTask: vi.fn(),
}));

vi.mock("../../../socket/socket.events.js", () => ({
  emitActivity: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logActivity", () => {
  it("persists the activity and fans it out to the org room", async () => {
    const activity = { id: "act1", type: "TASK_CREATED" };

    vi.mocked(createActivity).mockResolvedValue(activity as never);

    const result = await logActivity({
      organizationId: "org1",
      projectId: "proj1",
      taskId: "task1",
      actorId: "user1",
      type: "TASK_CREATED",
    });

    expect(createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        type: "TASK_CREATED",
      }),
    );
    expect(emitActivity).toHaveBeenCalledWith("org1", activity);
    expect(result).toBe(activity);
  });
});
