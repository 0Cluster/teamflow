import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRedisClient } from "../../../database/redis.js";
import { cacheDel, cacheGet, cacheSet } from "../cache.js";

vi.mock("../../../database/redis.js", () => ({
  getRedisClient: vi.fn(),
}));

function fakeClient() {
  const data = new Map<string, { raw: string; expiresAt: number }>();

  return {
    async get(key: string) {
      const entry = data.get(key);
      if (!entry || entry.expiresAt <= Date.now()) {
        return null;
      }
      return entry.raw;
    },
    async set(
      key: string,
      raw: string,
      _mode: string,
      ttlSeconds: number,
    ) {
      data.set(key, {
        raw,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return "OK";
    },
    async del(...keys: string[]) {
      let removed = 0;
      for (const key of keys) {
        if (data.delete(key)) {
          removed += 1;
        }
      }
      return removed;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cache helpers", () => {
  it("round-trips JSON through Redis", async () => {
    vi.mocked(getRedisClient).mockReturnValue(fakeClient() as never);

    await cacheSet("k", { projects: [1, 2] }, 60);

    expect(await cacheGet("k")).toEqual({ projects: [1, 2] });
  });

  it("deletes keys", async () => {
    const client = fakeClient();
    vi.mocked(getRedisClient).mockReturnValue(client as never);

    await cacheSet("a", [1], 60);
    await cacheSet("b", [2], 60);
    await cacheDel(["a", "b"]);

    expect(await cacheGet("a")).toBeNull();
    expect(await cacheGet("b")).toBeNull();
  });

  it("misses through when Redis is unavailable", async () => {
    vi.mocked(getRedisClient).mockReturnValue(null);

    await cacheSet("k", [1], 60);

    expect(await cacheGet("k")).toBeNull();
    await cacheDel(["k"]);
  });

  it("misses on corrupt payloads", async () => {
    const client = fakeClient();
    vi.mocked(getRedisClient).mockReturnValue(client as never);

    await client.set("k", "not-json{{{", "EX", 60);

    expect(await cacheGet("k")).toBeNull();
  });
});
