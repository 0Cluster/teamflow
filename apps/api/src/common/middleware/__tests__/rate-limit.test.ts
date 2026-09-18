import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  rateLimit,
  resetRateLimits,
} from "../rate-limit.middleware.js";

function mockReq(ip = "1.2.3.4") {
  return { ip } as never;
}

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
  };
  return res;
}

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests under the limit and sets headers", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const next = vi.fn();

    const res = mockRes();
    limiter(mockReq(), res as never, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.headers["RateLimit-Limit"]).toBe("2");
    expect(res.headers["RateLimit-Remaining"]).toBe("1");
  });

  it("rejects with 429 once the limit is exceeded", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const next = vi.fn();

    limiter(mockReq(), mockRes() as never, next);
    limiter(mockReq(), mockRes() as never, next);

    const res = mockRes();
    limiter(mockReq(), res as never, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "TOO_MANY_REQUESTS" },
    });
  });

  it("tracks buckets per IP and resets after the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = rateLimit({ windowMs: 1_000, max: 1 });
    const next = vi.fn();

    limiter(mockReq("9.9.9.9"), mockRes() as never, next);

    const blocked = mockRes();
    limiter(mockReq("9.9.9.9"), blocked as never, next);
    expect(blocked.statusCode).toBe(429);

    const otherIp = mockRes();
    limiter(mockReq("8.8.8.8"), otherIp as never, next);
    expect(next).toHaveBeenCalledTimes(2);

    vi.setSystemTime(1_001);
    const afterWindow = mockRes();
    limiter(mockReq("9.9.9.9"), afterWindow as never, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
