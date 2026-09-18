import { Redis as UpstashRedis } from "@upstash/redis";

import { env } from "../config/env.js";

/*
 * Upstash (REST) Redis client. Unlike the native client in
 * `database/redis.ts`, this is stateless HTTPS — ideal for hosts
 * like Render where long-lived TCP connections are awkward.
 * Pub/sub is unavailable over REST, so the Socket.IO adapter
 * always stays on the native client; rate limiting and caching
 * work identically on either backend.
 */

let client: UpstashRedis | null = null;
let available = false;
let warned = false;

function warnOnce(message: string): void {
  if (!warned) {
    warned = true;
    console.warn(`[upstash] ${message}`);
  }
}

export function isUpstashConfigured(): boolean {
  return (
    env.UPSTASH_REDIS_REST_URL !== undefined &&
    env.UPSTASH_REDIS_REST_TOKEN !== undefined
  );
}

export function isUpstashAvailable(): boolean {
  return available && client !== null;
}

export function getUpstashClient(): UpstashRedis | null {
  return isUpstashAvailable() ? client : null;
}

export async function connectUpstash(): Promise<void> {
  if (!isUpstashConfigured()) {
    return;
  }

  try {
    client = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });

    await client.ping();
    available = true;
  } catch {
    available = false;
    warnOnce(
      "Upstash unreachable, continuing with other backends",
    );
  }
}

export async function disconnectUpstash(): Promise<void> {
  client = null;
  available = false;
}
