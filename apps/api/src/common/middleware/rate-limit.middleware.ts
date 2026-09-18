import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/*
 * Minimal in-memory sliding-window rate limiter for abuse-prone
 * endpoints (login/register/refresh brute force).
 *
 * Only FAILED responses (status >= 400) consume budget: successes,
 * validation slips, and ordinary retries never lock a legitimate
 * user out — only repeated failures trip the 429.
 *
 * Deliberately dependency-free. Single-process only: behind a
 * multi-instance deployment this must be replaced with a shared
 * store (e.g. Redis) — see the note on `hits`.
 */
const hits = new Map<string, number[]>();

const MAX_TRACKED_KEYS = 5000;

function pruneExpired(now: number, windowMs: number): void {
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter(
      (timestamp) => timestamp > now - windowMs,
    );

    if (fresh.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, fresh);
    }
  }
}

function freshHits(key: string, now: number, windowMs: number): number[] {
  const timestamps = (hits.get(key) ?? []).filter(
    (timestamp) => timestamp > now - windowMs,
  );

  hits.set(key, timestamps);

  return timestamps;
}

export function rateLimit({
  windowMs,
  max,
  message,
}: RateLimitOptions) {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    if (hits.size > MAX_TRACKED_KEYS) {
      pruneExpired(now, windowMs);
    }

    const timestamps = freshHits(key, now, windowMs);

    if (timestamps.length >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((timestamps[0]! + windowMs - now) / 1000),
      );

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message:
            message ??
            "Too many requests, please try again later",
        },
      });

      return;
    }

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader(
      "RateLimit-Remaining",
      String(max - timestamps.length),
    );

    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      if (res.statusCode >= 400) {
        const current = freshHits(key, Date.now(), windowMs);
        current.push(Date.now());
        hits.set(key, current);
      }

      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}

export function resetRateLimits(): void {
  hits.clear();
}
