import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateTaskForProject } from "../task.service.js";
import { updateTask } from "../task.controller.js";

vi.mock("../task.service.js", () => ({
  createTaskForProject: vi.fn(),
  deleteTaskForProject: vi.fn(),
  getTaskForProject: vi.fn(),
  listMyTasks: vi.fn(),
  listTasksForProject: vi.fn(),
  updateTaskForProject: vi.fn(),
}));

const updateMock = vi.mocked(updateTaskForProject);

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateTask response envelope", () => {
  it("returns { data: { task } } like create/get", async () => {
    const task = { id: "t1", title: "Updated" };
    updateMock.mockResolvedValue(task as never);

    const req = {
      user: { id: "user1" },
      params: {
        organizationId: "org1",
        projectId: "proj1",
        taskId: "t1",
      },
      body: { title: "Updated" },
    } as never;

    const res = mockRes();

    await updateTask(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { task },
    });
  });
});
