# TeamFlow Web

React 19 + Vite + Tailwind CSS 4 + TanStack Query single-page app.

## Setup

```sh
npm install          # from the repo root
cp .env.example .env # optional; defaults target local API
npm run dev --workspace web
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api/v1` | REST API base URL |
| `VITE_SOCKET_URL` | `http://localhost:5000` | Socket.io server URL |

## Scripts

```sh
npm run dev --workspace web        # Vite dev server
npm run typecheck --workspace web  # tsc -b
npm run build --workspace web      # production build into dist/
```

## Notes

- Access tokens live in memory; sessions restore via the httpOnly refresh cookie.
- Realtime updates arrive over socket.io (`hooks/use-live-*.ts`) and only
  invalidate react-query caches — REST refetches stay authoritative.
- Shared API envelope types come from `@teamflow/shared`.
