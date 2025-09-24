# Local Development with Docker

This repository now ships with a Docker-based development environment that mirrors production while keeping the feedback loop fast. The setup runs the PostgreSQL database, the Go API (with hot reload via [Air](https://github.com/air-verse/air)), and the Next.js web app (with hot reload) on your machine.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.20+ or Docker Engine 24+
- Docker Compose v2 (bundled with modern Docker Desktop)

> **Tip:** The stack binds to local ports `3000` (web), `8080` (API), and `5432` (database). Make sure those ports are free before starting.

## Quick Start

```bash
docker compose -f docker-compose.dev.yml up --build
```

- The **web app** is available at [http://localhost:3000](http://localhost:3000)
- The **API** is available at [http://localhost:8080](http://localhost:8080)
- PostgreSQL listens on `localhost:5432` with user `postgres` / password `postgres`

The first run installs dependencies and can take a few minutes. Subsequent runs are much faster thanks to persistent Docker volumes for the Go build cache, pnpm store, and database data.

To stop everything press `Ctrl+C` (foreground) or run:

```bash
docker compose -f docker-compose.dev.yml down
```

To remove the development database and caches, add `--volumes`:

```bash
docker compose -f docker-compose.dev.yml down --volumes
```

## Hot Reload Behaviour

- **API (`apps/api`)** – The service installs the Air hot reload daemon on first boot and re-builds the Go server whenever `.go`, `.sql`, `.yaml`, or `.json` files change. Files under `apps/api/tmp`, `uploads`, and `test_escape` are ignored.
- **Web (`apps/web`)** – Next.js runs in development mode with polling enabled so changes made on the host are reflected instantly. A named Docker volume keeps `node_modules` separate from your working tree.

## Default Environment Variables

The compose file provides sensible defaults for local development:

| Service | Variable | Default |
| ------- | -------- | ------- |
| Database | `POSTGRES_USER` | `postgres` |
| Database | `POSTGRES_PASSWORD` | `postgres` |
| Database | `POSTGRES_DB` | `it_tms` |
| API | `DATABASE_URL` | `postgres://postgres:postgres@db:5432/it_tms?sslmode=disable` |
| API | `JWT_SECRET` | `dev-secret-change-me-please-1234567890` |
| API | `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` |
| API | `WS_ALLOWED_ORIGINS` | `http://localhost:3000` |
| API | `WEB_APP_URL` | `http://localhost:3000` |
| Web | `NEXT_PUBLIC_API_URL` | `http://localhost:8080` |
| Web | `NEXT_PUBLIC_WS_URL` | `ws://localhost:8080/ws` |
| Web | `NEXT_PUBLIC_SOCKET_URL` | `ws://localhost:8080/ws` |

Override any value by defining the variable in your shell or in a `.env` file next to `docker-compose.dev.yml` before running `docker compose`.

## Seed Data

On startup the `db-seed` job runs `apps/api/cmd/seed/main.go`. It ensures a useful set of demo users exists and clears development-only data. Sign in with any of these credentials:

- Manager: `peachchan@demo.com` / `Password!1`
- Supervisor: `saroge@demo.com` / `Password!1`
- User: `manit@demo.com` / `Password!1`

You can re-run the seeder at any time:

```bash
docker compose -f docker-compose.dev.yml run --rm db-seed
```

## Running Workspace Commands

Execute additional commands inside the running containers:

- Run API tests:
  ```bash
  docker compose -f docker-compose.dev.yml exec api go test ./...
  ```
- Run web linting:
  ```bash
  docker compose -f docker-compose.dev.yml exec web pnpm --filter @it-tms/web lint
  ```

## Troubleshooting

- If the API fails to compile, check the terminal running `docker compose` for Air logs.
- Next.js dev server binds to `0.0.0.0:3000`. If the browser cannot connect, ensure your firewall allows localhost traffic.
- Remove cached volumes if dependencies act up: `docker compose -f docker-compose.dev.yml down --volumes`.

Happy hacking! 🎉
