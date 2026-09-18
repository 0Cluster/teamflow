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
- MongoDB: local instance or a free MongoDB Atlas cluster

## Setup

```sh
npm install
cp apps/api/.env.example apps/api/.env   # fill in secrets (min 32 chars)
cp apps/web/.env.example apps/web/.env   # optional; defaults target localhost
```

### MongoDB Atlas instead of localhost

1. Atlas console → create a free cluster → **Database Access** → add a
   user + password.
2. **Network Access** → allow your IP (or `0.0.0.0/0` for hosted APIs —
   prefer the host's static IP / VPC peering when available).
3. **Connect** → Drivers → copy the `mongodb+srv://` string and set it as
   `MONGODB_URI` in `apps/api/.env` (keep the `/teamflow` database path).
4. Start the API (`npm run dev:api`) — `MongoDB connected` confirms it.
   A malformed URI fails fast at boot with a clear message.

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

## Security posture

- JWT access (15m, Bearer) + rotating httpOnly refresh sessions with reuse
  detection; bcrypt-12 password hashes (72-char cap matches the algorithm limit).
- Helmet headers, strict single-origin CORS, 100kb JSON body cap.
- Rate limits count failures only: login 20/15min, register 20/hour,
  refresh 120/hour, all other API routes 500/15min per IP. Backed by Redis
  when `REDIS_URL` is set, in-memory otherwise. `trust proxy` is set for
  correct client IPs.
- Malformed ObjectIds return 400 (`INVALID_ID_FORMAT`), never 500s; unknown
  errors stay generic. Task search input is regex-escaped (ReDoS-safe).
- Org/project/task/comment/label/activity reads are membership-scoped;
  notifications are user-scoped; deletes are OWNER-only; refresh cookies are
  `Secure` in production and path-scoped to `/api/v1/auth`.

## Redis (optional)

Two backends, one active at a time (Upstash wins when both are set):

- **Upstash REST** (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`,
  both required) — recommended for hosting: stateless HTTPS, no
  connections to manage. Covers rate limiting and caching.
- **Native Redis** (`REDIS_URL`, `redis://` or TLS `rediss://`) — local
  development, plus the only backend that supports Socket.IO fan-out
  across instances.

Everything degrades gracefully without either: in-memory rate limits,
pass-through caches, single-process sockets. MongoDB stays the source
of truth.

- `GET /projects` is cached per user (60s TTL) with explicit
  invalidation on every project/membership/organization write.
- `GET /health` reports `redis: disabled|connected|unavailable` plus
  `redisBackend: "upstash"|"native"|null`.
- Live suites: `REDIS_URL=redis://localhost:6379 npx vitest run
  redis.integration`, and with Upstash vars exported,
  `npx vitest run upstash.integration`.

### Upstash (managed Redis)

Two ways to use Upstash — pick per need:

- **REST (recommended for Render/serverless):** Upstash console →
  **REST API** → copy the URL and token into `UPSTASH_REDIS_REST_URL`
  and `UPSTASH_REDIS_REST_TOKEN`. Covers rate limiting and caching over
  stateless HTTPS; no connections to manage.
- **Native endpoint (multi-instance sockets):** Upstash console →
  **Endpoints** → the `rediss://default:<token>@<endpoint>:6379` URL as
  `REDIS_URL` (TLS negotiated automatically). Required for Socket.IO
  fan-out across instances, since the adapter needs RESP pub/sub.

Restart the API and confirm with `curl localhost:5000/health` →
`"redis": "connected"` plus `"redisBackend": "upstash"` (Upstash wins
when both are set). `"unavailable"` means configured-but-unreachable —
the API keeps running on memory fallbacks.

## Deployment checklist

- API: `npm run build --workspace api && npm start --workspace api`
  (Node 20+). Required env: `MONGODB_URI`, `JWT_ACCESS_SECRET`,
  `JWT_REFRESH_SECRET` (each 32+ chars — enforced at boot).
- `FRONTEND_URL` must be the deployed web URL or CORS/socket connections
  fail (a boot warning fires if it still points at localhost in production).
- Cookies: same-domain hosting works with the default `lax`; split-domain
  hosting (e.g. Vercel + Render) needs `COOKIE_SAMESITE=none` over HTTPS.
- Web: `npm run build --workspace web` → static `apps/web/dist`.
  `VITE_API_URL`/`VITE_SOCKET_URL` bake in at build time — rebuild to change.
- One-command hosting: `render.yaml` at the repo root provisions the API
  service + static site (set the `sync: false` values in the dashboard).
  The API build uses `npm ci --include=dev` on purpose, and `typescript`
  plus all `@types/*` packages live in `dependencies` (not dev) — either
  alone survives production-pruned installs that would otherwise fail
  with `TS7016`.
- Optional: `REDIS_URL` (rate limits, cache, socket fan-out).
- Verify: `GET /health` → healthy (+ redis state), `/api/docs` for the API.
- Never commit `.env`; `.env.example` files are tracked as templates.
