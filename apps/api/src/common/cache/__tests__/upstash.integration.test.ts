import { afterAll, describe, expect, it } from "vitest";
import { Redis as UpstashRestClient } from "@upstash/redis";

import { RedisRateLimitStore } from "../../rate-limit/rate-limit.store.js";
import { getActiveBackendName } from "../../../database/backends.js";
import {
  connectUpstash,
  disconnectUpstash,
} from "../../../database/upstash.js";

/*
 * Live Upstash integration: runs only when both Upstash vars are set:
 *   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... npx vitest run upstash.integration
 * so CI without credentials stays green. Keys are unique per run.
 */
const runIfUpstash =
  process.env.UPSTASH_REDIS_REST_URL !== undefined &&
  process.env.UPSTASH_REDIS_REST_TOKEN !== undefined
    ? describe
    : describe.skip;

function unique(suffix: string): string {
  return `teamflow:test:${Date.now()}:${Math.random().toString(36).slice(2)}:${suffix}`;
}

runIfUpstash("Upstash integration", () => {
  afterAll(async () => {
    await disconnectUpstash();
  });

  it("selects Upstash as the active backend", async () => {
    await connectUpstash();

    expect(getActiveBackendName()).toBe("upstash");
  });

  it("counts rate limits over REST", async () => {
    const client = new UpstashRestClient({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const store = new RedisRateLimitStore(() => client);
    const bucket = unique("rl");

    await store.recordFailure(bucket, 30_000);
    await store.recordFailure(bucket, 30_000);

    const { failures } = await store.countFailures(bucket, 30_000);

    expect(failures).toBe(2);
  });

  it("round-trips cache entries over REST", async () => {
    const { cacheDel, cacheGet, cacheSet } = await import("../cache.js");
    const cacheKey = unique("cache");

    await cacheSet(cacheKey, { hello: "upstash" }, 60);

    expect(await cacheGet(cacheKey)).toEqual({ hello: "upstash" });

    await cacheDel([cacheKey]);

    expect(await cacheGet(cacheKey)).toBeNull();
  });
});
