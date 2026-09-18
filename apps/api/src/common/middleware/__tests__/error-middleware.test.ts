import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../errors/app-error.js";
import { errorMiddleware } from "../error.middleware.js";

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

const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("errorMiddleware", () => {
  it("passes AppError through with its code", () => {
    const res = mockRes();

    errorMiddleware(
      new AppError(403, "NOPE", "Denied"),
      {} as never,
      res as never,
      next,
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: { code: "NOPE", message: "Denied" },
    });
  });

  it("maps Mongoose CastError (bad ObjectId) to 400", () => {
    const res = mockRes();
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    (castError as unknown as Record<string, unknown>).path =
      "organizationId";

    errorMiddleware(castError, {} as never, res as never, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INVALID_ID_FORMAT",
        message: "Invalid organizationId format",
      },
    });
  });

  it("maps Mongoose ValidationError to 400", () => {
    const res = mockRes();
    const validationError = new Error("Task validation failed");
    validationError.name = "ValidationError";

    errorMiddleware(validationError, {} as never, res as never, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("hides unknown errors behind a generic 500", () => {
    const res = mockRes();
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    errorMiddleware(
      new Error("db password=hunter2"),
      {} as never,
      res as never,
      next,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
    });

    consoleSpy.mockRestore();
  });
});
