import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/*
 * Minimal in-memory sliding-window rate limiter for abuse-prone
 * endpoints (login/register brute force).
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

    const timestamps = (hits.get(key) ?? []).filter(
      (timestamp) => timestamp > now - windowMs,
    );

    if (timestamps.length >= max) {
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

    timestamps.push(now);
    hits.set(key, timestamps);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader(
      "RateLimit-Remaining",
      String(max - timestamps.length),
    );

    next();
  };
}

export function resetRateLimits(): void {
  hits.clear();
}
