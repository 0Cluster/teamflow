import type { NextFunction, Request, Response } from "express";

import {
  getRateLimitStore,
  type RateLimitStore,
} from "../rate-limit/rate-limit.store.js";

interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
  message?: string;
  store?: RateLimitStore;
}

/*
 * Failure-counting rate limiter (see rate-limit.store.ts).
 * Buckets are namespaced per limiter: sharing one bucket across
 * login and register would let failures on one lock out the other.
 */
export function rateLimit({
  name,
  windowMs,
  max,
  message,
  store = getRateLimitStore(),
}: RateLimitOptions) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = `${name}:${req.ip ?? "unknown"}`;
    const { failures, resetAfterMs } = await store.countFailures(
      key,
      windowMs,
    );

    if (failures >= max) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil(resetAfterMs / 1000))),
      );
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
      String(Math.max(0, max - failures)),
    );

    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      if (res.statusCode >= 400) {
        void store.recordFailure(key, windowMs).catch(() => {
          // Counting must never break responses.
        });
      }

      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}

export function resetRateLimits(): void {
  getRateLimitStore().reset();
}
