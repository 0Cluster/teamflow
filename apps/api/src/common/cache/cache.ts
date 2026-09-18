import {
  getActiveBackendName,
} from "../../database/backends.js";
import { getRedisClient } from "../../database/redis.js";
import { getUpstashClient } from "../../database/upstash.js";

/*
 * Tiny read-through cache. Misses, disabled backends, and
 * serialization failures all degrade to `null` / no-op so
 * callers stay simple: MongoDB is always the source of truth.
 *
 * Cached entries carry short TTLs plus explicit invalidation on
 * writes — never rely on TTL alone for authorization-adjacent
 * data (e.g. who can see which projects).
 */

interface CacheBackend {
  getRaw(key: string): Promise<string | null>;
  setRaw(key: string, raw: string, ttlSeconds: number): Promise<void>;
  delKeys(keys: string[]): Promise<void>;
}

function normalizeRaw(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // @upstash/redis deserializes stored JSON; native ioredis
  // returns the raw string. Accept both shapes.
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function selectBackend(): CacheBackend | null {
  const backend = getActiveBackendName();

  if (backend === "upstash") {
    const client = getUpstashClient();

    if (!client) {
      return null;
    }

    return {
      getRaw: async (key) => normalizeRaw(await client.get(key)),
      setRaw: async (key, raw, ttlSeconds) => {
        await client.set(key, raw, { ex: ttlSeconds });
      },
      delKeys: async (keys) => {
        await client.del(...keys);
      },
    };
  }

  if (backend === "native") {
    const client = getRedisClient();

    if (!client) {
      return null;
    }

    return {
      getRaw: (key) => client.get(key),
      setRaw: async (key, raw, ttlSeconds) => {
        await client.set(key, raw, "EX", ttlSeconds);
      },
      delKeys: async (keys) => {
        await client.del(...keys);
      },
    };
  }

  return null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const backend = selectBackend();

  if (!backend) {
    return null;
  }

  try {
    const raw = await backend.getRaw(key);

    if (raw === null) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const backend = selectBackend();

  if (!backend) {
    return;
  }

  try {
    await backend.setRaw(key, JSON.stringify(value), ttlSeconds);
  } catch {
    // Cache writes must never break responses.
  }
}

export async function cacheDel(keys: string[]): Promise<void> {
  const backend = selectBackend();

  if (!backend || keys.length === 0) {
    return;
  }

  try {
    await backend.delKeys(keys);
  } catch {
    // Cache writes must never break responses.
  }
}
