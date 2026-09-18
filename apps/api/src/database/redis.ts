import { Redis, type Redis as RedisClient } from "ioredis";

import { env } from "../config/env.js";

/*
 * Optional Redis connection. Redis is a performance/scaling layer:
 * rate-limit counters, read-through caches, and (later) the
 * Socket.IO adapter. MongoDB stays the source of truth, and every
 * consumer must degrade gracefully when this returns null —
 * the API runs fully without Redis (memory fallbacks).
 */

let client: RedisClient | null = null;
let available = false;
let warned = false;

function warnOnce(message: string): void {
  if (!warned) {
    warned = true;
    console.warn(`[redis] ${message}`);
  }
}

export function isRedisConfigured(): boolean {
  return env.REDIS_URL !== undefined;
}

export function isRedisAvailable(): boolean {
  return available && client !== null;
}

export function getRedisClient(): RedisClient | null {
  return isRedisAvailable() ? client : null;
}

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    return;
  }

  try {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    client.on("error", () => {
      available = false;
    });

    client.on("ready", () => {
      available = true;
    });

    // Explicit connect: with lazyConnect + enableOfflineQueue off,
    // the first command would otherwise fail instead of connecting.
    await client.connect();
    await client.ping();
    available = true;
  } catch {
    available = false;
    warnOnce(
      "Redis unreachable, continuing with in-memory fallbacks",
    );
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await client?.quit();
  } catch {
    // Already gone; nothing to do.
  } finally {
    client = null;
    available = false;
  }
}
