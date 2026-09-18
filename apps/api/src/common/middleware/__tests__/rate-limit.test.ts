import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  rateLimit,
  resetRateLimits,
} from "../rate-limit.middleware.js";

function mockReq(ip = "1.2.3.4") {
  return { ip } as never;
}

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
  setHeader: (name: string, value: string) => void;
}

function mockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: null,
    headers: {},
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

function failThrough(
  limiter: ReturnType<typeof rateLimit>,
  res: MockResponse,
  next: () => void,
  status = 400,
  ip = "1.2.3.4",
) {
  limiter(mockReq(ip), res as never, next as never);
  res.status(status).json({ ok: false });
}

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("lets successes through without consuming budget", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      const res = mockRes();
      limiter(mockReq(), res as never, next as never);
      res.status(200).json({ ok: true });
    }

    expect(next).toHaveBeenCalledTimes(5);
  });

  it("rejects with 429 once failures exceed the limit", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const next = vi.fn();

    failThrough(limiter, mockRes(), next);
    failThrough(limiter, mockRes(), next);

    const blocked = mockRes();
    limiter(mockReq(), blocked as never, next as never);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toMatchObject({
      success: false,
      error: { code: "TOO_MANY_REQUESTS" },
    });
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });

  it("tracks buckets per IP and resets after the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const limiter = rateLimit({ windowMs: 1_000, max: 1 });
    const next = vi.fn();

    failThrough(limiter, mockRes(), next, 400, "9.9.9.9");

    const blocked = mockRes();
    limiter(mockReq("9.9.9.9"), blocked as never, next as never);
    expect(blocked.statusCode).toBe(429);

    const otherIp = mockRes();
    limiter(mockReq("8.8.8.8"), otherIp as never, next as never);
    (otherIp as MockResponse).status(200).json({ ok: true });
    expect(next).toHaveBeenCalledTimes(2);

    vi.setSystemTime(1_001);
    const afterWindow = mockRes();
    limiter(mockReq("9.9.9.9"), afterWindow as never, next as never);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
