import { getRedisClient } from "../../database/redis.js";

/*
 * Tiny read-through cache over Redis. Misses, disabled Redis,
 * and serialization failures all degrade to `null` / no-op so
 * callers stay simple: MongoDB is always the source of truth.
 *
 * Cached entries carry short TTLs plus explicit invalidation on
 * writes — never rely on TTL alone for authorization-adjacent
 * data (e.g. who can see which projects).
 */

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const raw = await client.get(key);

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
  const client = getRedisClient();

  if (!client) {
    return;
  }

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache writes must never break responses.
  }
}

export async function cacheDel(keys: string[]): Promise<void> {
  const client = getRedisClient();

  if (!client || keys.length === 0) {
    return;
  }

  try {
    await client.del(...keys);
  } catch {
    // Cache writes must never break responses.
  }
}
