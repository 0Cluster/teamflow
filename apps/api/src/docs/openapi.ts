/*
 * TeamFlow OpenAPI 3.0 specification.
 *
 * Hand-written against the implemented controllers so the docs
 * never drift from behavior: status codes, envelopes, roles,
 * and cascade notes below all mirror `src/modules/*`.
 *
 * Served as JSON at GET /api/docs.json with interactive UI at
 * GET /api/docs (see `src/app.ts`). Adding a route? Add it here.
 */

const userRoleEnum = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

const membershipRoleEnum = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

const taskStatusEnum = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const taskPriorityEnum = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const notificationTypeEnum = [
  "TASK_ASSIGNED",
  "TASK_STATUS_CHANGED",
  "COMMENT_CREATED",
  "MEMBER_ADDED",
  "MEMBER_ROLE_CHANGED",
  "OWNERSHIP_TRANSFERRED",
];

const objectId = {
  type: "string",
  description: "MongoDB ObjectId as a 24-character hex string",
  example: "64f1b2c3d4e5f60718293a4b5",
};

function pathParam(name: string, description: string) {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: objectId,
  };
}

const organizationIdParam = pathParam(
  "organizationId",
  "Organization ID. Caller must be a member.",
);

const projectIdParam = pathParam("projectId", "Project ID.");

const taskIdParam = pathParam("taskId", "Task ID.");

const bearerAuth = [{ bearerAuth: [] }];

const validationError = {
  description: "Validation failed",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

const unauthorizedError = {
  description:
    "Missing/invalid/expired access token. Send `Authorization: Bearer <token>`.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

const forbiddenError = {
  description:
    "Authenticated but not allowed (not a member, or role too low).",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

const notFoundError = {
  description: "Resource not found",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorResponse" },
    },
  },
};

const taskQueryParameters = [
  {
    name: "status",
    in: "query",
    required: false,
    schema: { type: "string", enum: taskStatusEnum },
  },
  {
    name: "priority",
    in: "query",
    required: false,
    schema: { type: "string", enum: taskPriorityEnum },
  },
  {
    name: "assigneeId",
    in: "query",
    required: false,
    description: "Filter by assignee user ID.",
    schema: objectId,
  },
  {
    name: "labelId",
    in: "query",
    required: false,
    description: "Filter by label ID.",
    schema: objectId,
  },
  {
    name: "search",
    in: "query",
    required: false,
    description: "Case-insensitive match against title/description.",
    schema: { type: "string", maxLength: 100 },
  },
  {
    name: "page",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, default: 1 },
  },
  {
    name: "limit",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
  },
  {
    name: "sortBy",
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: [
        "createdAt",
        "updatedAt",
        "priority",
        "status",
        "number",
        "dueDate",
      ],
      default: "createdAt",
    },
  },
  {
    name: "sortOrder",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
  },
];

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TeamFlow API",
    version: "1.0.0",
    description:
      "Team/project management API. All domain routes require a JWT access token " +
      "(`Authorization: Bearer <token>`, 15-minute lifetime). Sessions refresh via the " +
      "httpOnly `refreshToken` cookie. Organization-scoped routes additionally require " +
      "membership; write operations require OWNER/ADMIN as documented per route. " +
      "All success bodies use `{ success: true, data: ... }`; errors use " +
      "`{ success: false, error: { code, message } }`.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],
  security: bearerAuth,
  tags: [
    { name: "Auth" },
    { name: "Organizations" },
    { name: "Members" },
    { name: "Projects" },
    { name: "Tasks" },
    { name: "Labels" },
    { name: "Comments" },
    { name: "Activity" },
    { name: "Notifications" },
    { name: "Health" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Service health check",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "healthy" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered. Note: register does NOT sign in.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "409": {
            description: "Email already registered (EMAIL_ALREADY_EXISTS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "429": {
            description: "Too many accounts created (rate limited)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with email and password",
        description:
          "Returns an access token and sets the httpOnly `refreshToken` cookie.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated",
            headers: {
              "Set-Cookie": {
                description: "httpOnly refreshToken cookie (7 days)",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: {
                          type: "string",
                          description: "JWT access token (15 minutes)",
                        },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": {
            description: "Invalid email or password (INVALID_CREDENTIALS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "403": {
            description: "Account disabled (ACCOUNT_DISABLED)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "429": {
            description: "Too many login attempts (rate limited)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate the session and get a new access token",
        description:
          "Reads the httpOnly `refreshToken` cookie, revokes the old session, " +
          "and sets a fresh cookie.",
        security: [],
        parameters: [
          {
            name: "refreshToken",
            in: "cookie",
            required: true,
            description: "httpOnly refresh token cookie",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "New token pair issued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        accessToken: { type: "string" },
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Missing/invalid/expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Sign out and revoke the session",
        description:
          "No authorization required. Revokes the session if the cookie is " +
          "valid and always clears it.",
        security: [],
        parameters: [
          {
            name: "refreshToken",
            in: "cookie",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Logged out",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "Logged out successfully",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current session identity",
        description:
          "Returns the `{ id, role }` identity embedded in the access token.",
        responses: {
          "200": {
            description: "Session identity",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        user: {
                          $ref: "#/components/schemas/SessionUser",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
        },
      },
    },

    "/api/v1/organizations": {
      post: {
        tags: ["Organizations"],
        summary: "Create an organization",
        description:
          "The slug is generated server-side from the name. The creator " +
          "becomes the OWNER member.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateOrganizationInput",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Organization created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        organization: {
                          $ref: "#/components/schemas/Organization",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
        },
      },
      get: {
        tags: ["Organizations"],
        summary: "List my organizations",
        description:
          "Organizations the caller belongs to, each with their membership role.",
        responses: {
          "200": {
            description: "Organization list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        organizations: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/OrganizationWithRole",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}": {
      get: {
        tags: ["Organizations"],
        summary: "Get an organization",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Organization",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        organization: {
                          $ref: "#/components/schemas/Organization",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Organizations"],
        summary: "Delete an organization (OWNER only)",
        description:
          "Cascades to memberships, labels, projects, tasks, comments, and activity.",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Organization deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "Organization deleted successfully",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/members": {
      get: {
        tags: ["Members"],
        summary: "List organization members",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Member list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        members: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/Member",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
      post: {
        tags: ["Members"],
        summary: "Add a member (OWNER/ADMIN)",
        description:
          "The user must already have a TeamFlow account. Notifies them and " +
          "emits a realtime member event.",
        parameters: [organizationIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddMemberInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Member added",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        member: { $ref: "#/components/schemas/Member" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": {
            description: "No user with that email (USER_NOT_FOUND)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Already a member (MEMBER_ALREADY_EXISTS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },

    "/api/v1/organizations/{organizationId}/members/{userId}": {
      patch: {
        tags: ["Members"],
        summary: "Change a member role (OWNER/ADMIN)",
        description:
          "Only the OWNER can grant OWNER (ownership transfer demotes them to " +
          "ADMIN); ADMINs can only manage MEMBER/VIEWER rows; the OWNER cannot " +
          "demote themselves or be modified by others. Notifies the target.",
        parameters: [
          organizationIdParam,
          pathParam("userId", "Target member's user ID."),
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateMemberRoleInput",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Role updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        member: { $ref: "#/components/schemas/Member" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Members"],
        summary: "Remove a member (OWNER/ADMIN)",
        description:
          "The OWNER cannot be removed (transfer first); ADMINs cannot remove " +
          "other ADMINs; nobody can remove themselves (use leave).",
        parameters: [
          organizationIdParam,
          pathParam("userId", "Target member's user ID."),
        ],
        responses: {
          "200": {
            description: "Member removed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "Member removed successfully",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/leave": {
      post: {
        tags: ["Members"],
        summary: "Leave an organization",
        description:
          "Any member except the OWNER (transfer ownership first).",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Left the organization",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "You have left the organization",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Owner tried to leave (OWNER_CANNOT_LEAVE)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/projects": {
      get: {
        tags: ["Projects"],
        summary: "List my projects across organizations",
        description:
          "Derived from the access token: every project in every organization " +
          "the caller belongs to.",
        responses: {
          "200": {
            description: "Project list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        projects: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/Project",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects": {
      post: {
        tags: ["Projects"],
        summary: "Create a project (OWNER/ADMIN)",
        parameters: [organizationIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateProjectInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Project created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        project: {
                          $ref: "#/components/schemas/Project",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "409": {
            description: "Key taken in this org (PROJECT_KEY_ALREADY_EXISTS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Projects"],
        summary: "List organization projects",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Project list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        projects: {
                          type: "array",
                          items: {
                            $ref: "#/components/schemas/Project",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}": {
      get: {
        tags: ["Projects"],
        summary: "Get a project",
        parameters: [organizationIdParam, projectIdParam],
        responses: {
          "200": {
            description: "Project",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        project: {
                          $ref: "#/components/schemas/Project",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project (OWNER/ADMIN)",
        description: "At least one of name/description is required.",
        parameters: [organizationIdParam, projectIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProjectInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Project updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        project: {
                          $ref: "#/components/schemas/Project",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project (OWNER only)",
        description:
          "Cascades to its tasks, comments, and activity, then logs a " +
          "PROJECT_DELETED tombstone.",
        parameters: [organizationIdParam, projectIdParam],
        responses: {
          "200": {
            description: "Project deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        message: {
                          type: "string",
                          example: "Project deleted successfully",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks assigned to me",
        description:
          "Derived from the access token across all member organizations.",
        parameters: taskQueryParameters.filter(
          (param) =>
            param.name !== "assigneeId" && param.name !== "labelId",
        ),
        responses: {
          "200": {
            description: "Paginated tasks with organization context",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/TasksResponse" },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks": {
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        description:
          "Any member may create. The assignee must be an org member; " +
          "assigning notifies them (unless self-assigned). Task numbers " +
          "auto-increment per project (`KEY-42`).",
        parameters: [organizationIdParam, projectIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTaskInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        task: { $ref: "#/components/schemas/Task" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      get: {
        tags: ["Tasks"],
        summary: "List project tasks",
        parameters: [
          organizationIdParam,
          projectIdParam,
          ...taskQueryParameters,
        ],
        responses: {
          "200": {
            description: "Paginated tasks",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/TasksResponse" },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}": {
      get: {
        tags: ["Tasks"],
        summary: "Get a task",
        parameters: [organizationIdParam, projectIdParam, taskIdParam],
        responses: {
          "200": {
            description: "Task",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        task: { $ref: "#/components/schemas/Task" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update a task",
        description:
          "Any member may update. Reassignment and status changes notify the " +
          "affected member (unless self-inflicted). At least one field required.",
        parameters: [organizationIdParam, projectIdParam, taskIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTaskInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        task: { $ref: "#/components/schemas/Task" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task (OWNER only)",
        description:
          "Cascades to comments and activity, then logs a TASK_DELETED tombstone.",
        parameters: [organizationIdParam, projectIdParam, taskIdParam],
        responses: {
          "204": { description: "Task deleted (no body)" },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/labels": {
      post: {
        tags: ["Labels"],
        summary: "Create a label (OWNER/ADMIN)",
        parameters: [organizationIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateLabelInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Label created (raw document)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/LabelDocument" },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "409": {
            description: "Name taken in this org (LABEL_ALREADY_EXISTS)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Labels"],
        summary: "List organization labels",
        parameters: [organizationIdParam],
        responses: {
          "200": {
            description: "Label list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/LabelDocument",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/labels/{labelId}": {
      patch: {
        tags: ["Labels"],
        summary: "Update a label (OWNER/ADMIN)",
        description: "At least one of name/color is required.",
        parameters: [
          organizationIdParam,
          pathParam("labelId", "Label ID."),
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateLabelInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Label updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/LabelDocument" },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Labels"],
        summary: "Delete a label (OWNER/ADMIN)",
        parameters: [
          organizationIdParam,
          pathParam("labelId", "Label ID."),
        ],
        responses: {
          "204": { description: "Label deleted (no body)" },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/labels/{labelId}": {
      post: {
        tags: ["Labels"],
        summary: "Attach a label to a task",
        description: "The label must belong to the organization.",
        parameters: [
          organizationIdParam,
          projectIdParam,
          taskIdParam,
          pathParam("labelId", "Label ID."),
        ],
        responses: {
          "200": {
            description: "Task with the label attached",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Labels"],
        summary: "Detach a label from a task",
        parameters: [
          organizationIdParam,
          projectIdParam,
          taskIdParam,
          pathParam("labelId", "Label ID."),
        ],
        responses: {
          "200": {
            description: "Task with the label detached",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments": {
      post: {
        tags: ["Comments"],
        summary: "Comment on a task",
        description:
          "Notifies the task creator and assignee (except the author).",
        parameters: [organizationIdParam, projectIdParam, taskIdParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCommentInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Comment created (raw document)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      $ref: "#/components/schemas/CommentDocument",
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
      get: {
        tags: ["Comments"],
        summary: "List task comments",
        parameters: [organizationIdParam, projectIdParam, taskIdParam],
        responses: {
          "200": {
            description: "Comments oldest-first with populated authors",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/CommentDocument",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/comments/{commentId}": {
      patch: {
        tags: ["Comments"],
        summary: "Edit your own comment",
        parameters: [
          organizationIdParam,
          projectIdParam,
          taskIdParam,
          pathParam("commentId", "Comment ID."),
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCommentInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Comment updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      $ref: "#/components/schemas/CommentDocument",
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": {
            description: "Only the author (or OWNER/ADMIN on delete) may edit",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": notFoundError,
        },
      },
      delete: {
        tags: ["Comments"],
        summary: "Delete a comment (author or OWNER/ADMIN)",
        parameters: [
          organizationIdParam,
          projectIdParam,
          taskIdParam,
          pathParam("commentId", "Comment ID."),
        ],
        responses: {
          "204": { description: "Comment deleted (no body)" },
          "401": unauthorizedError,
          "403": forbiddenError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/activity": {
      get: {
        tags: ["Activity"],
        summary: "Recent organization activity",
        parameters: [
          organizationIdParam,
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Newest-first activity entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Activity" },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/activity": {
      get: {
        tags: ["Activity"],
        summary: "Recent project activity",
        parameters: [
          organizationIdParam,
          projectIdParam,
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Newest-first activity entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Activity" },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
    },

    "/api/v1/organizations/{organizationId}/projects/{projectId}/tasks/{taskId}/activity": {
      get: {
        tags: ["Activity"],
        summary: "Recent task activity",
        parameters: [
          organizationIdParam,
          projectIdParam,
          taskIdParam,
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Newest-first activity entries",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Activity" },
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
          "403": forbiddenError,
        },
      },
    },

    "/api/v1/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List my notifications",
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "unreadOnly",
            in: "query",
            required: false,
            description: "Pass `true` or `false` as a string.",
            schema: { type: "boolean", default: false },
          },
        ],
        responses: {
          "200": {
            description: "Notifications with pagination and unread count",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      $ref: "#/components/schemas/NotificationsResponse",
                    },
                  },
                },
              },
            },
          },
          "400": validationError,
          "401": unauthorizedError,
        },
      },
    },

    "/api/v1/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a notification as read",
        description: "Only the owning user can mark it (scoped by user ID).",
        parameters: [
          pathParam("notificationId", "Notification ID."),
        ],
        responses: {
          "200": {
            description: "Updated notification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      $ref: "#/components/schemas/Notification",
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
          "404": notFoundError,
        },
      },
    },

    "/api/v1/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all my notifications as read",
        responses: {
          "200": {
            description: "Bulk update result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        modifiedCount: {
                          type: "integer",
                          example: 3,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": unauthorizedError,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Short-lived access token from POST /api/v1/auth/login (or /refresh).",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_ERROR",
              },
              message: { type: "string" },
              details: {
                description: "Zod flatten/issues payload, when applicable",
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: objectId,
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: userRoleEnum },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SessionUser: {
        type: "object",
        description: "Identity embedded in the access token (GET /me).",
        properties: {
          id: objectId,
          role: { type: "string", enum: userRoleEnum },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8, maxLength: 72 },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      Organization: {
        type: "object",
        properties: {
          id: objectId,
          name: { type: "string" },
          slug: { type: "string", example: "acme-inc" },
          ownerId: objectId,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      OrganizationWithRole: {
        allOf: [
          { $ref: "#/components/schemas/Organization" },
          {
            type: "object",
            properties: {
              role: { type: "string", enum: membershipRoleEnum },
            },
          },
        ],
      },
      CreateOrganizationInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
        },
      },
      Member: {
        type: "object",
        properties: {
          userId: objectId,
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: membershipRoleEnum },
          joinedAt: { type: "string", format: "date-time" },
        },
      },
      AddMemberInput: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          role: {
            type: "string",
            enum: ["ADMIN", "MEMBER", "VIEWER"],
            default: "MEMBER",
          },
        },
      },
      UpdateMemberRoleInput: {
        type: "object",
        required: ["role"],
        properties: {
          role: { type: "string", enum: membershipRoleEnum },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: objectId,
          organizationId: objectId,
          name: { type: "string" },
          key: { type: "string", example: "API" },
          description: { type: "string" },
          createdBy: objectId,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateProjectInput: {
        type: "object",
        required: ["name", "key"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          key: {
            type: "string",
            minLength: 2,
            maxLength: 10,
            pattern: "^[A-Z][A-Z0-9]{1,9}$",
            description: "Uppercase key used in task identifiers (KEY-42).",
          },
          description: { type: "string", maxLength: 1000 },
        },
      },
      UpdateProjectInput: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          description: { type: "string", maxLength: 1000 },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: objectId,
          organizationId: {
            ...objectId,
            description: "Present on cross-organization responses.",
          },
          projectId: objectId,
          number: { type: "integer", minimum: 1 },
          identifier: { type: "string", example: "API-42" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: taskStatusEnum },
          priority: { type: "string", enum: taskPriorityEnum },
          assigneeId: { type: "string", nullable: true },
          labelIds: { type: "array", items: { type: "string" } },
          createdBy: objectId,
          dueDate: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateTaskInput: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
          priority: { type: "string", enum: taskPriorityEnum, default: "MEDIUM" },
          assigneeId: {
            ...objectId,
            description: "Must be an organization member.",
          },
          dueDate: { type: "string", format: "date-time" },
          labelIds: {
            type: "array",
            maxItems: 20,
            items: { type: "string" },
          },
        },
      },
      UpdateTaskInput: {
        type: "object",
        minProperties: 1,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          description: { type: "string", maxLength: 5000 },
          priority: { type: "string", enum: taskPriorityEnum },
          assigneeId: { type: "string", nullable: true },
          dueDate: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
          status: { type: "string", enum: taskStatusEnum },
          labelIds: {
            type: "array",
            maxItems: 20,
            items: { type: "string" },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
          hasNextPage: { type: "boolean" },
          hasPreviousPage: { type: "boolean" },
        },
      },
      TasksResponse: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: { $ref: "#/components/schemas/Task" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      LabelDocument: {
        type: "object",
        description:
          "Raw Mongoose document (note `_id`, unlike mapped DTOs).",
        properties: {
          _id: objectId,
          organizationId: objectId,
          name: { type: "string" },
          color: { type: "string", example: "#6366f1" },
          createdBy: objectId,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateLabelInput: {
        type: "object",
        required: ["name", "color"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          color: {
            type: "string",
            pattern: "^#[0-9A-Fa-f]{6}$",
            example: "#6366f1",
          },
        },
      },
      UpdateLabelInput: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        },
      },
      CommentDocument: {
        type: "object",
        description:
          "Raw Mongoose document; `authorId` is populated with name/email on list.",
        properties: {
          _id: objectId,
          organizationId: objectId,
          projectId: objectId,
          taskId: objectId,
          authorId: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  _id: objectId,
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            ],
          },
          content: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateCommentInput: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", minLength: 1, maxLength: 5000 },
        },
      },
      UpdateCommentInput: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", minLength: 1, maxLength: 5000 },
        },
      },
      Activity: {
        type: "object",
        description:
          "Raw activity document; actor/project/task refs are populated on read.",
        properties: {
          _id: objectId,
          organizationId: objectId,
          projectId: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  _id: objectId,
                  name: { type: "string" },
                  key: { type: "string" },
                },
              },
            ],
            nullable: true,
          },
          taskId: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  _id: objectId,
                  number: { type: "integer" },
                  title: { type: "string" },
                },
              },
            ],
            nullable: true,
          },
          actorId: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  _id: objectId,
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            ],
          },
          type: {
            type: "string",
            example: "TASK_CREATED",
          },
          metadata: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        description: "Mapped DTO (never raw): flat IDs plus rich sub-objects.",
        properties: {
          id: objectId,
          userId: objectId,
          organizationId: objectId,
          projectId: { type: "string", nullable: true },
          taskId: { type: "string", nullable: true },
          actorId: { type: "string", nullable: true },
          actor: {
            type: "object",
            nullable: true,
            properties: {
              id: objectId,
              name: { type: "string" },
              email: { type: "string" },
            },
          },
          project: {
            type: "object",
            nullable: true,
            properties: {
              id: objectId,
              name: { type: "string" },
              key: { type: "string" },
            },
          },
          task: {
            type: "object",
            nullable: true,
            properties: {
              id: objectId,
              number: { type: "integer" },
              title: { type: "string" },
            },
          },
          type: { type: "string", enum: notificationTypeEnum },
          title: { type: "string" },
          message: { type: "string" },
          isRead: { type: "boolean" },
          metadata: { type: "object" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      NotificationsResponse: {
        type: "object",
        properties: {
          notifications: {
            type: "array",
            items: { $ref: "#/components/schemas/Notification" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
          unreadCount: { type: "integer" },
        },
      },
    },
  },
};
