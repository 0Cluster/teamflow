import type { Redis as RedisClient } from "ioredis";

import { getRedisClient } from "../../database/redis.js";

export interface RateLimitCount {
  failures: number;
  resetAfterMs: number;
}

export interface RateLimitStore {
  countFailures(key: string, windowMs: number): Promise<RateLimitCount>;
  recordFailure(key: string, windowMs: number): Promise<void>;
  reset(): void;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  async countFailures(
    key: string,
    windowMs: number,
  ): Promise<RateLimitCount> {
    const now = Date.now();
    const fresh = this.prune(key, now, windowMs);

    return {
      failures: fresh.length,
      resetAfterMs:
        fresh.length === 0 ? 0 : Math.max(0, fresh[0]! + windowMs - now),
    };
  }

  async recordFailure(
    key: string,
    windowMs: number,
  ): Promise<void> {
    const now = Date.now();
    const fresh = this.prune(key, now, windowMs);
    fresh.push(now);
    this.hits.set(key, fresh);
  }

  reset(): void {
    this.hits.clear();
  }

  private prune(key: string, now: number, windowMs: number): number[] {
    const fresh = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > now - windowMs,
    );

    this.hits.set(key, fresh);

    return fresh;
  }
}

/*
 * Fixed-window counters: `INCR` is atomic, the key expires with
 * the window. Slightly coarser than the sliding memory store,
 * but correct under concurrency and across instances.
 */
export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly getClient: () => RedisClient | null,
    private readonly fallback: RateLimitStore = new MemoryRateLimitStore(),
  ) {}

  async countFailures(
    key: string,
    windowMs: number,
  ): Promise<RateLimitCount> {
    const client = this.getClient();

    if (!client) {
      return this.fallback.countFailures(key, windowMs);
    }

    try {
      const namespaced = this.namespaced(key, windowMs);
      const [countRaw, ttl] = await Promise.all([
        client.get(namespaced),
        client.pttl(namespaced),
      ]);

      return {
        failures: countRaw === null ? 0 : Number(countRaw),
        resetAfterMs: ttl > 0 ? ttl : 0,
      };
    } catch {
      return this.fallback.countFailures(key, windowMs);
    }
  }

  async recordFailure(
    key: string,
    windowMs: number,
  ): Promise<void> {
    const client = this.getClient();

    if (!client) {
      await this.fallback.recordFailure(key, windowMs);
      return;
    }

    try {
      const namespaced = this.namespaced(key, windowMs);
      const count = await client.incr(namespaced);

      if (count === 1) {
        await client.pexpire(namespaced, windowMs);
      }
    } catch {
      await this.fallback.recordFailure(key, windowMs);
    }
  }

  reset(): void {
    this.fallback.reset();
  }

  private namespaced(key: string, windowMs: number): string {
    const windowId = Math.floor(Date.now() / windowMs);

    return `rl:${key}:${windowId}`;
  }
}

let sharedStore: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!sharedStore) {
    sharedStore = new RedisRateLimitStore(getRedisClient);
  }

  return sharedStore;
}

export function resetRateLimitStore(): void {
  sharedStore = null;
}
