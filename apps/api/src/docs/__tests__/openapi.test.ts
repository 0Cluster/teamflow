import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../../app.js";
import { openApiSpec } from "../openapi.js";

const EXPECTED_PATHS = [
  "/health",
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/auth/me",
  "/api/v1/organizations",
  "/api/v1/organizations/{organizationId}",
  "/api/v1/organizations/{organizationId}/members",
  "/api/v1/organizations/{organizationId}/members/{userId}",
  "/api/v1/organizations/{organizationId}/leave",
  "/api/v1/projects",
  "/api/v1/organizations/{organizationId}/projects",
  "/api/v1/organizations/{organizationId}/projects/{projectId}",
  "/api/v1/tasks",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}",
  "/api/v1/organizations/{organizationId}/labels",
  "/api/v1/organizations/{organizationId}/labels/{labelId}",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels/{labelId}",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}",
  "/api/v1/organizations/{organizationId}/activity",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/activity",
  "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/activity",
  "/api/v1/notifications",
  "/api/v1/notifications/{notificationId}/read",
  "/api/v1/notifications/read-all",
];

function collectRefs(node: unknown, refs: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(item, refs);
    }
    return;
  }

  if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string") {
        refs.push(value);
      } else {
        collectRefs(value, refs);
      }
    }
  }
}

describe("OpenAPI docs", () => {
  it("documents the exact implemented route set", () => {
    expect(Object.keys(openApiSpec.paths).sort()).toEqual(
      [...EXPECTED_PATHS].sort(),
    );
  });

  it("resolves every local $ref", () => {
    const refs: string[] = [];
    collectRefs(openApiSpec, refs);

    expect(refs.length).toBeGreaterThan(0);

    for (const ref of refs) {
      const match = /^#\/components\/schemas\/([\w]+)$/.exec(ref);
      expect(match, `unexpected ref ${ref}`).not.toBeNull();

      expect(
        openApiSpec.components.schemas,
        `missing schema for ${ref}`,
      ).toHaveProperty(match![1]);
    }
  });

  it("serves the raw spec without touching API behavior", async () => {
    const specResponse = await request(app).get("/api/docs.json");

    expect(specResponse.status).toBe(200);
    expect(specResponse.body.openapi).toBe("3.0.3");
    expect(Object.keys(specResponse.body.paths)).toHaveLength(
      EXPECTED_PATHS.length,
    );

    const uiResponse = await request(app).get("/api/docs/");

    expect(uiResponse.status).toBe(200);
    expect(uiResponse.headers["content-type"]).toContain("text/html");

    const healthResponse = await request(app).get("/health");

    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.data.redis).toBe("disabled");

    const guardedResponse = await request(app).get("/api/v1/projects");

    expect(guardedResponse.status).toBe(401);
  });
});
