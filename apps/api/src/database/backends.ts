import { getRedisClient, isRedisConfigured } from "./redis.js";
import { getUpstashClient, isUpstashConfigured } from "./upstash.js";

/*
 * Backend selection for everything Redis-flavored. Upstash (REST)
 * wins when configured — it is the managed/production path —
 * then native Redis, then nothing (callers degrade to memory).
 * Exactly one backend is ever active, so rate-limit counters and
 * caches can never split-brain across stores.
 */

export interface CommandSource {
  incr(key: string): Promise<number>;
  get(key: string): Promise<unknown>;
  pttl(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<unknown>;
}

export type BackendName = "upstash" | "native" | null;

export function isAnyRedisConfigured(): boolean {
  return isUpstashConfigured() || isRedisConfigured();
}

export function getActiveBackendName(): BackendName {
  if (getUpstashClient()) {
    return "upstash";
  }

  if (getRedisClient()) {
    return "native";
  }

  return null;
}

export function getCommandSource(): CommandSource | null {
  return getUpstashClient() ?? getRedisClient();
}
