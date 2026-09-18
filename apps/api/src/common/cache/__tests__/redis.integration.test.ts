import { afterAll, describe, expect, it } from "vitest";
import { Redis } from "ioredis";

import { RedisRateLimitStore } from "../../rate-limit/rate-limit.store.js";
import {
  connectRedis,
  disconnectRedis,
} from "../../../database/redis.js";
import { cacheDel, cacheGet, cacheSet } from "../cache.js";

/*
 * Live integration suite: runs only when REDIS_URL is set, e.g.
 *   REDIS_URL=redis://localhost:6379 npx vitest run redis.integration
 * so CI without Redis stays green via the fake-client suites.
 * Keys are unique per run with short TTLs; nothing to clean up.
 */
const runIfRedis = process.env.REDIS_URL
  ? describe
  : describe.skip;

function unique(suffix: string): string {
  return `teamflow:test:${Date.now()}:${Math.random().toString(36).slice(2)}:${suffix}`;
}

runIfRedis("Redis integration", () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  it("counts rate limits in Redis", async () => {
    const client = new Redis(process.env.REDIS_URL!);

    try {
      const store = new RedisRateLimitStore(() => client);
      const bucket = unique("rl");

      await store.recordFailure(bucket, 5_000);
      await store.recordFailure(bucket, 5_000);

      const { failures, resetAfterMs } = await store.countFailures(
        bucket,
        5_000,
      );

      expect(failures).toBe(2);
      expect(resetAfterMs).toBeGreaterThan(0);
      expect(resetAfterMs).toBeLessThanOrEqual(5_000);
    } finally {
      client.disconnect();
    }
  });

  it("round-trips cache entries with TTL", async () => {
    await connectRedis();

    const cacheKey = unique("cache");

    await cacheSet(cacheKey, { hello: "world" }, 60);

    expect(await cacheGet(cacheKey)).toEqual({ hello: "world" });

    await cacheDel([cacheKey]);

    expect(await cacheGet(cacheKey)).toBeNull();
  });
});
