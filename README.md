# TeamFlow

Full-stack team/project management application (portfolio project).

**Stack:** React 19 + Vite + Tailwind + TanStack Query · Node.js + Express 5 + TypeScript · MongoDB/Mongoose · Socket.io · Zod · JWT (access + rotating refresh sessions).

## Structure

```text
teamflow/
├── apps/
│   ├── api/      # Express REST API (modular: auth, users, organizations,
│   │             # memberships, projects, tasks, labels, comments,
│   │             # activity, notifications, sessions)
│   └── web/      # React SPA (routes, features, react-query, sockets)
└── packages/
    └── shared/   # @teamflow/shared — transport contracts (ApiResponse, Pagination)
```

## Prerequisites

- Node.js 20+, npm 10+
- MongoDB (local or Atlas)

## Setup

```sh
npm install
cp apps/api/.env.example apps/api/.env   # fill in secrets (min 32 chars)
cp apps/web/.env.example apps/web/.env   # optional; defaults target localhost
```

## Scripts (repo root)

```sh
npm run dev:api     # API with tsx watch
npm run dev:web     # Vite dev server
npm run typecheck   # api (tsc --noEmit) + web (tsc -b)
npm run test        # API vitest suite
npm run build       # production builds for api + web
```

## Auth model

- `POST /api/v1/auth/register|login` → access token (15m, `Authorization: Bearer`) + httpOnly refresh cookie (7d, persisted hashed session).
- `POST /api/v1/auth/refresh` restores sessions; `GET /api/v1/auth/me` proves the token.
- Every domain route requires `authenticate`; org-scoped routes additionally require `requireOrganizationMember` (+ `requireOrganizationRole` for admin writes).

## Key endpoints

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/api/v1/organizations` | my orgs (via membership) |
| DELETE | `/api/v1/organizations/:orgId` | owner only, cascades all org data |
| GET | `/api/v1/projects` | my projects across orgs |
| GET | `/api/v1/organizations/:orgId/projects` | org projects |
| DELETE | `/api/v1/organizations/:orgId/projects/:projectId` | owner only, cascades tasks/comments/activity |
| GET | `/api/v1/tasks` | tasks assigned to me (filterable) |
| GET | `/api/v1/organizations/:orgId/projects/:projectId/tasks` | project tasks |
| DELETE | `/api/v1/organizations/:orgId/projects/:projectId/tasks/:taskId` | owner only, cascades comments/activity |
| GET/PATCH | `/api/v1/notifications`, `/notifications/:id/read`, `/notifications/read-all` | my notifications |

Deleting a project cascades to its tasks, comments, and activity; deleting a task cascades to its comments and activity (a `TASK_DELETED` tombstone is kept).

## Realtime

Socket.io mirrors REST over org-scoped rooms (`organization:{id}`,
membership-gated on join) plus per-user `user:{id}` rooms for
notifications. Clients only invalidate react-query caches on events —
REST refetches stay authoritative. Live today: notifications, activity
feeds, Kanban/comments, project lists, member lists, "my tasks".

## Frontend routes

`/`, `/organizations`, `/organizations/:id`, `/organizations/:id/projects`, `/projects`, `/tasks`, `/organizations/:id/projects/:projectId/tasks[/:taskId]`, `/notifications`, `/login`, `/register`.

## API docs

With the API running: interactive Swagger UI at `http://localhost:5000/api/docs`,
raw OpenAPI 3.0 JSON at `http://localhost:5000/api/docs.json`. The spec is
hand-written in `apps/api/src/docs/openapi.ts` and pinned by
`src/docs/__tests__/openapi.test.ts`, which fails if a route is added or
removed without updating the docs.

## Deployment notes

- API: `npm run build --workspace api && npm start --workspace api` (needs `MONGODB_URI`, `JWT_*_SECRET`, `FRONTEND_URL`).
- Web: `npm run build --workspace web` → static `apps/web/dist`, point `VITE_API_URL` at the API.
- Never commit `.env`; `.env.example` files are tracked as templates.
