import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MemoryRateLimitStore,
  RedisRateLimitStore,
} from "../rate-limit.store.js";

beforeEach(() => {
  vi.useRealTimers();
});

describe("MemoryRateLimitStore", () => {
  it("counts failures inside the window only", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const store = new MemoryRateLimitStore();

    await store.recordFailure("k", 1_000);
    await store.recordFailure("k", 1_000);

    expect(await store.countFailures("k", 1_000)).toMatchObject({
      failures: 2,
    });

    vi.setSystemTime(1_001);

    expect(await store.countFailures("k", 1_000)).toMatchObject({
      failures: 0,
    });
  });

  it("reports time until the oldest failure expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const store = new MemoryRateLimitStore();

    await store.recordFailure("k", 1_000);
    vi.setSystemTime(400);

    const { resetAfterMs } = await store.countFailures("k", 1_000);

    expect(resetAfterMs).toBe(600);
  });

  it("isolates keys", async () => {
    const store = new MemoryRateLimitStore();

    await store.recordFailure("a", 60_000);

    expect(await store.countFailures("b", 60_000)).toMatchObject({
      failures: 0,
    });
  });
});

describe("RedisRateLimitStore with a fake client", () => {
  function fakeClient() {
    const data = new Map<string, { count: number; expiresAt: number }>();

    return {
      data,
      async incr(key: string) {
        const entry = data.get(key) ?? { count: 0, expiresAt: 0 };
        entry.count += 1;
        data.set(key, entry);
        return entry.count;
      },
      async pexpire(key: string, ms: number) {
        const entry = data.get(key);
        if (entry) {
          entry.expiresAt = Date.now() + ms;
        }
        return 1;
      },
      async get(key: string) {
        const entry = data.get(key);
        if (!entry || entry.expiresAt <= Date.now()) {
          return null;
        }
        return String(entry.count);
      },
      async pttl(key: string) {
        const entry = data.get(key);
        if (!entry) {
          return -2;
        }
        return Math.max(0, entry.expiresAt - Date.now());
      },
    };
  }

  it("counts through Redis and falls back on errors", async () => {
    const client = fakeClient();
    const store = new RedisRateLimitStore(() => client as never);

    await store.recordFailure("k", 60_000);
    await store.recordFailure("k", 60_000);

    const { failures, resetAfterMs } = await store.countFailures(
      "k",
      60_000,
    );

    expect(failures).toBe(2);
    expect(resetAfterMs).toBeGreaterThan(0);
  });

  it("uses memory fallback when Redis is down", async () => {
    const store = new RedisRateLimitStore(() => null);

    await store.recordFailure("k", 60_000);

    expect(await store.countFailures("k", 60_000)).toMatchObject({
      failures: 1,
    });
  });

  it("uses memory fallback when Redis throws", async () => {
    const store = new RedisRateLimitStore(
      () =>
        ({
          incr() {
            throw new Error("boom");
          },
        }) as never,
    );

    await store.recordFailure("k", 60_000);

    expect(await store.countFailures("k", 60_000)).toMatchObject({
      failures: 1,
    });
  });
});
