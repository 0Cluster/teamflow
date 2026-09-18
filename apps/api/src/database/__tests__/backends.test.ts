import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getActiveBackendName,
  getCommandSource,
  isAnyRedisConfigured,
} from "../backends.js";
import { getRedisClient } from "../redis.js";
import { getUpstashClient } from "../upstash.js";

vi.mock("../redis.js", () => ({
  getRedisClient: vi.fn(),
  isRedisConfigured: vi.fn(),
}));

vi.mock("../upstash.js", () => ({
  getUpstashClient: vi.fn(),
  isUpstashConfigured: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("backend selection", () => {
  it("prefers Upstash when both backends are available", () => {
    const upstash = { name: "upstash" };
    const native = { name: "native" };

    vi.mocked(getUpstashClient).mockReturnValue(upstash as never);
    vi.mocked(getRedisClient).mockReturnValue(native as never);

    expect(getActiveBackendName()).toBe("upstash");
    expect(getCommandSource()).toBe(upstash);
  });

  it("falls back to native Redis", () => {
    const native = { name: "native" };

    vi.mocked(getUpstashClient).mockReturnValue(null);
    vi.mocked(getRedisClient).mockReturnValue(native as never);

    expect(getActiveBackendName()).toBe("native");
    expect(getCommandSource()).toBe(native);
  });

  it("reports nothing when neither backend is available", () => {
    vi.mocked(getUpstashClient).mockReturnValue(null);
    vi.mocked(getRedisClient).mockReturnValue(null);

    expect(getActiveBackendName()).toBeNull();
    expect(getCommandSource()).toBeNull();
  });

  it("detects configuration from either source", async () => {
    const { isRedisConfigured } = await import("../redis.js");
    const { isUpstashConfigured } = await import("../upstash.js");

    vi.mocked(isUpstashConfigured).mockReturnValue(true);
    vi.mocked(isRedisConfigured).mockReturnValue(false);

    expect(isAnyRedisConfigured()).toBe(true);

    vi.mocked(isUpstashConfigured).mockReturnValue(false);
    vi.mocked(isRedisConfigured).mockReturnValue(false);

    expect(isAnyRedisConfigured()).toBe(false);
  });
});
