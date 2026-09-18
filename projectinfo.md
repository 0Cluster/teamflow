# TeamFlow — Project Information Guide

> Written for a first-time MERN developer. Every section explains
> **what** something is, **where** it lives in this repo, and **how**
> it works here — from JavaScript basics up to the production setup.

---

## Table of contents

1. [What TeamFlow is](#1-what-teamflow-is)
2. [The stack, piece by piece](#2-the-stack-piece-by-piece)
3. [Repository map](#3-repository-map)
4. [How the backend boots](#4-how-the-backend-boots)
5. [How MongoDB connects (Mongoose)](#5-how-mongodb-connects-mongoose)
6. [Backend architecture: the module pattern](#6-backend-architecture-the-module-pattern)
7. [A request's life, end to end (create a task)](#7-a-requests-life-end-to-end-create-a-task)
8. [Authentication & sessions](#8-authentication--sessions)
9. [Authorization: organizations, roles, ownership](#9-authorization-organizations-roles-ownership)
10. [Validation with Zod](#10-validation-with-zod)
11. [Error handling](#11-error-handling)
12. [All features and how each is implemented](#12-all-features-and-how-each-is-implemented)
13. [Realtime with Socket.IO](#13-realtime-with-socketio)
14. [Redis: what it does here](#14-redis-what-it-does-here)
15. [Frontend architecture](#15-frontend-architecture)
16. [How React state is managed here](#16-how-react-state-is-managed-here)
17. [Data fetching with TanStack Query](#17-data-fetching-with-tanstack-query)
18. [Routing (frontend + backend)](#18-routing-frontend--backend)
19. [Forms](#19-forms)
20. [Styling](#20-styling)
21. [API documentation (Swagger)](#21-api-documentation-swagger)
22. [Testing](#22-testing)
23. [Security posture](#23-security-posture)
24. [Environment variables](#24-environment-variables)
25. [Running locally](#25-running-locally)
26. [Deployment (Render + Atlas + Upstash)](#26-deployment-render--atlas--upstash)
27. [Glossary for MERN beginners](#27-glossary-for-mern-beginners)

---

## 1. What TeamFlow is

TeamFlow is a **team/project management web app** (think a small Jira/Trello):
users sign up, create **organizations** (workspaces), invite **members** with
roles, create **projects**, track **tasks** on a Kanban board, comment, label,
get **notifications**, and see everything update **live** over WebSockets.

It is a **full-stack TypeScript** portfolio project, deliberately built with
production patterns (layered modules, validation, auth, tests, docs, CI-ready
scripts) instead of toy CRUD.

---

## 2. The stack, piece by piece

| Layer | Technology | What it does here |
|---|---|---|
| Language | **TypeScript** (both ends) | Types catch bugs before runtime; the same union types (task statuses, roles) exist on both sides |
| Frontend UI | **React 19** | Component-based UI (`apps/web/src`) |
| Build/dev | **Vite** | Dev server with hot reload; production bundler (`apps/web/dist`) |
| Styling | **Tailwind CSS v4** | Utility classes like `rounded-xl border-slate-800` |
| Server state | **TanStack Query v5** | Caching/syncing all server data (see §17) |
| Forms | **react-hook-form + Zod** | Login/register/project forms with inline errors |
| HTTP client | **axios** | One configured instance (`lib/api.ts`) with token injection |
| Realtime client | **socket.io-client** | Live notifications, boards, feeds |
| Backend runtime | **Node.js 20+** | Runs the API |
| Web framework | **Express 5** | HTTP routing + middleware (`apps/api/src`) |
| Database | **MongoDB** (local or Atlas) | Document database holding all data |
| ODM | **Mongoose** | Schemas, models, queries, validation (§5) |
| Validation | **Zod** | Every request body/query is schema-checked (§10) |
| Auth | **jsonwebtoken + bcryptjs** | Signed tokens + password hashing (§8) |
| Realtime server | **Socket.IO** | Rooms + events (§13) |
| Cache/rate-limit | **Redis** (Upstash REST or native, optional) | Counters, project-list cache, socket fan-out (§14) |
| API docs | **swagger-ui-express** | Interactive docs at `/api/docs` (§21) |
| Tests | **Vitest + Supertest** | 60+ backend tests, no DB needed (§22) |
| Package manager | **npm workspaces** | One repo, three packages (`apps/*`, `packages/*`) |

**MERN refresher:** MERN = MongoDB + Express + React + Node. The "N" (Node) is
the runtime everything JS/TS executes in; Express is the thin HTTP layer on
top; React renders UI in the browser; MongoDB persists data as JSON-like
documents.

---

## 3. Repository map

```text
teamflow/
├── package.json            # workspace root: shared npm scripts
├── render.yaml             # Render blueprint (API service + static site)
├── README.md               # operator docs (setup, env, deploy)
├── projectinfo.md          # this file: how everything works
├── apps/
│   ├── api/                # Express backend
│   │   └── src/
│   │       ├── app.ts          # Express app: middleware + route mounting
│   │       ├── server.ts       # boot: DB → Redis → HTTP → sockets
│   │       ├── config/         # env.ts (validated), cookies.ts
│   │       ├── database/       # mongodb.ts, redis.ts, upstash.ts, backends.ts
│   │       ├── common/         # middleware, errors, cache, rate-limit, utils
│   │       ├── modules/        # one folder per domain (see §6)
│   │       ├── socket/         # auth, rooms, events, server
│   │       ├── utils/          # jwt, hash, regex, duration
│   │       └── docs/           # openapi.ts + drift-proof tests
│   └── web/                # React frontend
│       └── src/
│           ├── main.tsx        # React root + StrictMode
│           ├── app/            # App, providers, ErrorBoundary
│           ├── routes/         # AppRoutes (lazy pages), ProtectedRoute
│           ├── components/     # layout (Sidebar/Topbar/AppShell) + ui primitives
│           ├── features/       # one folder per domain (auth, tasks, ...)
│           ├── hooks/          # use-realtime, use-live-* socket hooks
│           ├── lib/            # api client, socket client, error helper
│           └── types/          # socket event contracts
└── packages/
    └── shared/             # @teamflow/shared: ApiResponse envelope, Pagination
```

**npm workspaces basics:** the root `package.json` declares
`"workspaces": ["apps/*", "packages/*"]`, so one `npm install` at the root
installs everything, and workspace packages can import each other by name
(e.g. the web app imports `ApiResponse` from `@teamflow/shared`).
`npm run <script> --workspace api` runs a script in one package.

---

## 4. How the backend boots

`apps/api/src/server.ts` runs this order, and each step must succeed:

1. **`connectDatabase()`** (`database/mongodb.ts`) — `mongoose.connect(MONGODB_URI)`.
   On failure it logs and exits with code 1 (a crashed boot is better than a
   half-alive API).
2. **`connectRedis()` / `connectUpstash()`** — optional; failures only warn
   and the API continues on memory fallbacks.
3. Creates the HTTP server from the Express `app`, attaches Socket.IO.
4. Listens on `PORT`. Also warns in production if `FRONTEND_URL` still points
   at localhost (dead-on-arrival CORS otherwise).

`app.ts` assembles middleware in order: `helmet()` (security headers) →
`cors()` (single allowed origin + credentials) → `express.json({limit:"100kb"})`
→ `cookieParser()` → docs routes → API routers → `/health` → error middleware
last (Express requires it last so it catches everything).

---

## 5. How MongoDB connects (Mongoose)

**MongoDB basics:** a document database — data lives in JSON-like objects
(documents) grouped into collections (like tables, but schemaless). No JOINs;
references between documents are stored as `_id`s (12-byte ObjectIds).

**Mongoose basics:** an ODM (Object-Document Mapper) that adds schemas, types,
and validation on top of the MongoDB driver. Three concepts per domain:

- **Schema** (`project.model.ts`): field definitions — types, required flags,
  enums, defaults, indexes (e.g. unique `{organizationId, key}` so two
  projects in one org can't share a key).
- **Model** (`model("Project", schema)`): the object you query with
  (`Project.find(...)`, `Project.create(...)`). Each model maps to a MongoDB
  collection (Mongoose pluralizes: `Project` → `projects`).
- **Repository** (`project.repository.ts`): our own thin layer holding *only*
  database calls — no business rules. Services call repositories; nothing else
  touches models directly.

Connection string: local `mongodb://localhost:27017/teamflow` or Atlas
`mongodb+srv://user:pass@cluster.mongodb.net/teamflow?...`. `env.ts` validates
the scheme at boot so a bad paste fails fast instead of hanging. Atlas
additionally needs your machine/server IP in **Network Access**.

**Populate:** Mongoose can auto-resolve references, e.g. `find().populate("actorId",
"name email")` replaces the raw user id with `{_id, name, email}`. Used for
activity feeds, comment authors, and member lists.

---

## 6. Backend architecture: the module pattern

Each domain (`auth`, `users`, `organizations`, `memberships`, `projects`,
`tasks`, `labels`, `comments`, `activity`, `notifications`, `sessions`) owns
its folder with the same five layers:

| File | Job | Example |
|---|---|---|
| `*.routes.ts` | URL → middleware chain → controller | `DELETE /…/tasks/:taskId` needs member + OWNER |
| `*.controller.ts` | HTTP in/out: parse params, validate body, call service, shape JSON | always `{success, data}` |
| `*.service.ts` | Business rules: existence checks, permissions logic, cross-module calls, socket emits | assignee must be a member; sequential task numbers |
| `*.repository.ts` | Mongoose queries only | `findTasksByProject(...)` |
| `*.schema.ts` | Zod input validation | title 1–200 chars, enums |
| `*.model.ts` / `*.types.ts` | Mongoose schema + TypeScript types | |

**Why layers?** Routes never touch the DB, services never touch HTTP. That is
what makes every service unit-testable with mocked repositories (no database
needed — see §22).

Shared code lives in `common/` (auth middleware, error middleware, rate
limiter, cache, `AppError`) and `utils/` (JWT, hashing, regex escaping).

---

## 7. A request's life, end to end (create a task)

`POST /api/v1/organizations/:orgId/projects/:projectId/tasks`
with `{title, assigneeId, ...}` and `Authorization: Bearer <token>`:

1. **`authenticate`** verifies the JWT, attaches `req.user = {id, role}`.
2. **`requireOrganizationMember`** loads the membership; non-members get 403.
   (Any member may create tasks; only OWNER may delete.)
3. **Controller** (`createTask`) safe-parses the body with `createTaskSchema`.
   Bad input → `400 VALIDATION_ERROR` with details.
4. **Service** (`createTaskForProject`): project must exist (404); assignee
   must be an org member (400); labels must belong to the org; task `number`
   = last number + 1 (giving identifiers like `API-42`).
5. **Repository** `Task.create(...)` writes the MongoDB document.
6. Side effects: `logActivity` (also emits a socket event), `notifyTaskAssigned`
   (skipped on self-assign), `emitTaskCreated` to the org/project rooms.
7. Controller responds `201 {success: true, data: {task}}`.

---

## 8. Authentication & sessions

Two tokens, two jobs:

- **Access token** (JWT, 15 min): sent as `Authorization: Bearer <token>` on
  every API call. Payload is just `{sub: userId, role}`. Stateless — the
  server verifies the signature, no DB lookup.
- **Refresh token** (JWT, 7 days): stored in an **httpOnly cookie** (JavaScript
  can't read it — XSS-proof) and hashed server-side in the `sessions`
  collection. `POST /auth/refresh` verifies it, **rotates** it (old hash
  replaced), and returns a fresh access token. Reuse of an old refresh token
  is treated as theft: the session is revoked.

Flows: `register` (hashes password with bcrypt-12, returns user only — you
still log in separately) → `login` (sets cookie, returns token+user) →
`refresh` (silent, on app load and token expiry) → `logout` (revokes session,
clears cookie, works even with an expired token). `GET /auth/me` returns the
token's `{id, role}` identity.

Passwords: never stored — only bcrypt hashes (12 rounds; the 72-char cap
matches bcrypt's own limit). Wrong email and wrong password both return the
same `INVALID_CREDENTIALS` so attackers can't enumerate accounts.

---

## 9. Authorization: organizations, roles, ownership

- Every user action happens inside an **organization**. Joining creates a
  **membership** with a role: `OWNER > ADMIN > MEMBER > VIEWER` (single OWNER).
- `requireOrganizationMember` gates every org-scoped route; `requireOrganizationRole(...)`
  gates writes (e.g. project create = OWNER/ADMIN; project/task/org delete =
  OWNER only).
- Ownership **transfer** demotes the old owner to ADMIN (backend enforces that
  only the owner can grant OWNER, owners can't demote/remove themselves — they
  must transfer or use the leave flow; non-owner owners... i.e. the owner row
  is untouchable).
- **Leave flow**: any non-owner member can leave; owners must transfer first.
- Everything is double-checked: route middleware *and* service-level checks,
  so a missing middleware can never silently open a hole.

---

## 10. Validation with Zod

**Zod basics:** a library for declaring runtime schemas
(`z.string().min(2)`) that double as TypeScript types (`z.infer<typeof ...>`).
Unlike TypeScript types (erased at runtime), Zod actually checks live data.

Used for every request body (`createTaskSchema`, `registerSchema`, …) and
query string (`taskQuerySchema`: status/priority enums, page/limit ranges,
sort fields — this is also what makes dynamic sort keys and filters safe from
NoSQL injection). Controllers use `safeParse` (manual 400s) or `parse` inside
try/catch. Env vars are validated the same way at boot (`config/env.ts`).

---

## 11. Error handling

One `errorMiddleware` (last in `app.ts`) maps everything to
`{success: false, error: {code, message}}`:

- `AppError(status, code, message)` thrown anywhere → its exact code/status.
- Mongoose `CastError` (e.g. `/organizations/abc`) → `400 INVALID_ID_FORMAT`
  instead of a 500.
- Mongoose `ValidationError` → 400. Zod failures → 400 with details.
- Anything else → logged server-side, generic `500 INTERNAL_SERVER_ERROR`
  to the client (never leak internals).

Rate-limit breaches are `429 TOO_MANY_REQUESTS` with a `Retry-After` header.

---

## 12. All features and how each is implemented

- **Auth** — §8. Files: `modules/auth/*`, `modules/users/*`, `modules/sessions/*`.
- **Organizations** — create (slug auto-generated from name), list mine (with
  my role), detail, OWNER-only delete with full cascade (memberships, labels,
  projects, tasks, comments, activity). `modules/organizations/*`.
- **Members & roles** — invite by email (must already have an account),
  role changes with transfer/self-demote guards, remove, leave.
  Role changes notify the target; every change logs activity + emits socket
  events. `modules/memberships/*`.
- **Projects** — CRUD per org + global `GET /projects` derived from the token
  (all projects across your orgs). Key uniqueness per org; delete cascades to
  tasks/comments/activity then logs a tombstone. `modules/projects/*`.
- **Tasks** — CRUD + Kanban board, filters (status/priority/assignee/label/
  search), pagination, sorting, sequential `KEY-42` numbering, assignee +
  label validation, `GET /tasks` (assigned to me). Delete is OWNER-only with
  cascade + tombstone. `modules/tasks/*`.
- **Labels** — org-scoped name/color tags, attach/detach per task.
  `modules/labels/*`, `task-label.*`.
- **Comments** — per task; authors edit own, OWNER/ADMIN may delete others';
  commenting notifies creator + assignee. `modules/comments/*`.
- **Activity** — append-only log of everything (tasks, comments, labels,
  projects, members, ownership). Read newest-first at org/project/task scope.
  `modules/activity/*`.
- **Notifications** — bell-style inbox for assignments, status changes,
  comments, member events. Mapped to a clean DTO (never raw docs), unread
  counts, mark-read-one/all. `modules/notifications/*`.
- **Dashboard** — live counts (orgs, projects, my tasks, unread) + recent
  notifications + quick links.
- **API docs** — Swagger UI at `/api/docs`, raw spec at `/api/docs.json`,
  hand-written in `docs/openapi.ts`, drift-pinned by tests (§21).
- **UX layer** — toasts, confirm modals, skeletons, error-retry states,
  optimistic drag-drop + mark-read, inline form validation, error boundary,
  mobile nav (`components/ui/*`).

---

## 13. Realtime with Socket.IO

**Socket.IO basics:** persistent WebSocket connections letting the *server*
push events to browsers (vs HTTP where only the client can initiate).

- Server (`socket/`): JWT handshake auth (`socket.auth.ts`), then each
  connection auto-joins its private `user:{id}` room. Clients may join
  `organization:{id}` / `project:{id}` / `task:{id}` rooms — the server
  re-checks membership on every join, so forged ids are rejected.
- Emits (`socket.events.ts`): `task:*`, `comment:*`, `project:*`,
  `member:*`, `activity:new` (org rooms), `notification:new` (user rooms).
- Frontend (`hooks/use-live-*.ts`): connects with the access token on login,
  joins rooms per page, and on events only **invalidates react-query caches** —
  REST refetches stay the source of truth, so a weird payload can never corrupt
  the UI. Covers notifications, activity feeds, Kanban, comments, project and
  member lists.
- Multi-instance scaling via the Redis adapter when configured (§14).

---

## 14. Redis: what it does here

Redis is a **performance/scaling layer only** — MongoDB is always the source
of truth, and everything degrades gracefully without it.

- **Rate limiting** — atomic fixed-window counters shared across instances
  (memory sliding-window fallback).
- **Caching** — `GET /projects` cached per user (60s TTL) with explicit
  invalidation on every project/membership/organization write (never TTL-only
  for visibility data).
- **Socket fan-out** — Redis adapter so rooms work across API instances.
- **Backends** (`database/`): native `REDIS_URL` and Upstash REST
  (`UPSTASH_REDIS_REST_URL` + `TOKEN`, paired-or-neither enforced at boot).
  Exactly one is active — Upstash wins when both are set. REST can't pub/sub,
  so the socket adapter always needs native.
- `GET /health` reports `redis: disabled|connected|unavailable` plus which
  backend is active.

---

## 15. Frontend architecture

- `main.tsx` → `App` → `AppProviders` (react-query client, Toast, Confirm) →
  `AuthProvider` → `AppRoutes`.
- **Routes** (`routes/AppRoutes.tsx`): every page lazy-loaded (code-split) inside
  `Suspense`, protected area guarded by `ProtectedRoute` (redirects to login),
  everything inside `AppShell` (Sidebar + Topbar). A `RouteErrorBoundary` turns
  any render crash into a readable error panel instead of a blank page.
- **Features** (`features/<domain>/`): each has `*.api.ts` (axios calls),
  `*.types.ts`, and page components. Shared contracts (`ApiResponse`,
  `Pagination`) come from `@teamflow/shared`.
- **API client** (`lib/api.ts`): one axios instance, base URL from
  `VITE_API_URL`, `withCredentials` (cookies), request interceptor injecting
  the in-memory access token.

---

## 16. How React state is managed here

Three buckets — this is the single most important frontend concept:

1. **Server state (react-query)** — anything from the API (projects, tasks,
   members…). Cached by query key (`["project-tasks", orgId, projectId]`),
   auto-refetched, invalidated after mutations. *Not* kept in `useState`
   (that causes stale-UI bugs).
2. **Local UI state (`useState`)** — form inputs, filters, toggles, expanded
   panels. Lives and dies in the component.
3. **Global client state (context)** — auth (`AuthProvider`: user, token,
   login/logout, session restore), toasts, confirm modal. Context = React's
   built-in dependency injection: `createContext` + `Provider` + `useContext`.

**Auth token specifics:** the access token lives in React state *and* a tiny
module mirror (`lib/auth-token.ts`) so the axios interceptor (outside React)
can read it. On app load, `AuthProvider` calls `POST /auth/refresh` (cookie
goes automatically) to restore the session.

---

## 17. Data fetching with TanStack Query

**The idea:** instead of `fetch` + `useState` + `useEffect` soup, you declare
*queries* (`useQuery`: key + fetcher) and *mutations* (`useMutation`: writer +
cache updates). React Query handles loading/error states, caching (30s stale
time here), retries (1x), background refetch, and request dedupe.

Patterns used in TeamFlow:

- `queryKey` arrays double as invalidation addresses: after creating a task,
  `invalidateQueries({queryKey: ["project-tasks", orgId, projectId]})`
  refreshes every filtered view of that board.
- `enabled: Boolean(orgId)` — don't fire until params exist.
- **Optimistic updates** — Kanban drag-drop and notification mark-read update
  the cache *before* the server answers, rolling back on error. Feels instant.
- Socket events only invalidate; queries re-fetch the truth (§13).

---

## 18. Routing (frontend + backend)

- **Backend** (`app.ts` + `*.routes.ts`): `/api/v1/...` REST endpoints, plus
  `/health` and `/api/docs`. Routers mount per module; every domain route runs
  `authenticate` first. Parameter order matters (e.g. `/notifications/read-all`
  can't be shadowed by `/:id/read` — different segment counts).
- **Frontend** (`AppRoutes.tsx`): `/login`, `/register`, `/` (dashboard),
  `/organizations…`, `/projects`, `/tasks`, nested
  `/organizations/:orgId/projects/:projectId/tasks/:taskId`, `/notifications`.
  Deep links preserve context (a notification links straight to its task).
  Unknown paths redirect home.

---

## 19. Forms

- **react-hook-form basics:** uncontrolled inputs registered by name; validation
  runs on submit/blur without re-rendering every keystroke.
- **Zod resolvers:** login/register/project forms declare Zod schemas whose
  rules render as inline red messages (e.g. project keys must match
  `^[A-Za-z][A-Za-z0-9]{1,9}$`, mirroring the backend regex).
- **Manual forms** (tasks, labels, members) use `useState` + disabled submit
  buttons + server-error boxes, since their validation is mostly "required".
- All mutations disable their buttons while pending to prevent double-submit.

---

## 20. Styling

Tailwind CSS v4 (Vite plugin): styling via utility classes directly in JSX
(`rounded-xl border border-slate-800 bg-slate-900`). Design tokens: slate
surfaces, indigo primary actions, **semantic colors** — red = destructive
(delete/remove/logout), amber = warning (leave/transfer ownership), emerald =
roles/admin actions. Dark-only theme; responsive via `md:`/`lg:` breakpoints
plus a hamburger nav under `md`.

---

## 21. API documentation (Swagger)

Hand-written OpenAPI 3.0 in `apps/api/src/docs/openapi.ts` (deliberately not
auto-generated, so descriptions, role gates, and cascade notes stay truthful).
`GET /api/docs.json` serves it; `GET /api/docs` serves the interactive UI.
`docs/__tests__/openapi.test.ts` pins the exact 28-path set, resolves every
`$ref`, and smoke-tests the live endpoints — add a route without updating the
spec and CI-style `npm test` fails.

---

## 22. Testing

- **Runner:** Vitest (`npm test` in `apps/api`), Supertest for HTTP-level
  checks. ~60 tests, all passing.
- **Philosophy:** services are tested with **mocked repositories**
  (`vi.mock`), so no MongoDB is needed: e.g. cascade tests assert children
  delete *before* parents and 404 paths delete nothing; contract tests assert
  notification DTO shapes and socket payloads.
- **Integration suites** (skipped without infra): native Redis
  (`REDIS_URL=... npx vitest run redis.integration`) and Upstash equivalents.
- **Frontend:** typecheck (`tsc -b`), ESLint (including react-hooks and
  refresh rules), and production `vite build` stand in for a test suite
  (no component tests yet — see README roadmap gap honesty: this is the
  thinnest area).

---

## 23. Security posture

- Short-lived Bearer tokens + rotating, reuse-detecting refresh sessions;
  bcrypt-12; uniform login errors.
- Helmet headers; strict single-origin CORS; 100kb JSON cap.
- Failure-counting rate limits (login 20/15min, register 20/hour, refresh
  120/hour, API 500/15min) — successes never consume budget, so legit users
  can't lock themselves out. Redis-backed when configured.
- Auth brute-force surface: login/register/refresh throttled; `Retry-After`
  headers; `trust proxy` for real client IPs.
- NoSQL-safe: all filters via Zod enums, search text regex-escaped (ReDoS).
- `Secure` + path-scoped httpOnly cookies in production; `SameSite`
  configurable (`lax` same-domain, `none` split-domain).
- Owner-only deletes, membership-scoped reads, user-scoped notifications,
  author/admin comment rules — enforced in middleware *and* services.

---

## 24. Environment variables

API (`apps/api/.env`, see `.env.example` — never commit the real one):

| Variable | Meaning |
|---|---|
| `MONGODB_URI` | `mongodb://…` local or `mongodb+srv://…` Atlas (scheme validated) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 32+ chars each, enforced at boot |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | e.g. `15m` / `7d` |
| `FRONTEND_URL` | Deployed web URL (CORS + sockets; warns if localhost in prod) |
| `COOKIE_SAMESITE` | `lax` (default) or `none` for split-domain hosting |
| `REDIS_URL` | Native Redis (also required for socket fan-out) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Upstash REST (paired or neither) |
| `NODE_ENV`, `PORT` | Standard |

Web build-time (`apps/web/.env`): `VITE_API_URL` (…/api/v1), `VITE_SOCKET_URL`.
These bake into `dist/` — rebuild to change.

---

## 25. Running locally

```sh
npm install
cp apps/api/.env.example apps/api/.env   # then fill secrets
npm run dev:api    # API + sockets on :5000 (tsx watch)
npm run dev:web    # Vite on :5173
npm run typecheck  # both apps
npm test           # API suite (root script)
npm run build      # production builds
```

MongoDB: local `mongod` or Atlas (allowlist your IP — see README).
Optional local Redis: `redis-server` (+ `REDIS_URL`).

---

## 26. Deployment (Render + Atlas + Upstash)

- `render.yaml` provisions the API service + static site. Gotchas already
  handled in-repo: build installs devDeps (`--include=dev`), `typescript` +
  `@types/*` live in `dependencies` so production-pruned installs still
  compile, `engines: >=20`.
- API needs: `MONGODB_URI` (Atlas, IP-allowlisted), both JWT secrets,
  `FRONTEND_URL`, `COOKIE_SAMESITE=none` for split domains.
- Web needs a rebuild with prod `VITE_*` URLs.
- Atlas: DB user + Network Access for the host; Upstash: paste REST URL +
  token; verify via `/health` (`redis: connected`).

---

## 27. Glossary for MERN beginners

- **CRUD** — Create/Read/Update/Delete, the four basic data operations.
- **REST** — HTTP conventions: nouns as URLs (`/projects`), verbs as methods
  (`GET/POST/PATCH/DELETE`), status codes as outcomes (`201` created,
  `400` bad input, `401` unauthenticated, `403` forbidden, `404` missing).
- **Middleware** — functions Express runs in order per request (auth, parsing,
  errors). Our error handler sits last to catch everything.
- **JWT** — a signed JSON blob proving identity without server-side sessions;
  the server verifies the signature with a secret.
- **httpOnly cookie** — a cookie JavaScript can't touch; the browser attaches
  it automatically. Used for the refresh token.
- **CORS** — browsers block pages from calling other origins unless the server
  allow-lists them (`FRONTEND_URL` here).
- **Optimistic update** — update the UI before the server answers, roll back
  on failure. Feels instant.
- **Hydration/populate** — replacing a stored `_id` with the referenced
  document's fields at read time.
- **Cascade delete** — deleting a parent (org/project/task) also deletes its
  children so no orphans remain.
- **Rate limiting** — capping requests per IP/window to blunt brute force.
- **DTO** — Data Transfer Object: the exact JSON shape an endpoint returns
  (often cleaner than raw DB documents).
- **Monorepo/workspaces** — one git repo containing multiple npm packages
  (`apps/*`, `packages/*`) sharing one install.
- **Code-splitting** — shipping each page as its own JS chunk loaded on
  demand (`React.lazy`), keeping first load small.
- **Error boundary** — a React component that catches render crashes below it
  and shows a fallback instead of a blank page.
