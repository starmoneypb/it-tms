# IT‑TMS Monorepo (Next.js + HeroUI + Go Fiber + Postgres)

A production‑ready monorepo for an **IT Ticket Management System** (IT‑TMS).

## Requirements

- **Node**: LTS (>= 20)
- **pnpm**: 9.x
- **Go**: latest stable (≥ 1.22)
- **Docker** + **Docker Compose**
- **golang-migrate** CLI (for local migrations)
- **sqlc** (optional; queries are provided and can be generated later)

## Quickstart

```bash
# 1) install deps
pnpm i

# 2) start Postgres
docker compose up -d db

# 3) dev (web + api)
pnpm dev

# API runs at http://localhost:8080
# Web runs at http://localhost:3000
```

### Migrations

Using `golang-migrate`:
```bash
cd apps/api
# Up (apply)
make migrate-up
# Down (rollback one)
make migrate-down
```

### Seeding

```bash
cd apps/api
make seed
```

### Environment

See **.env.example** at repo root and in each app:
- `apps/api/.env.example`
- `apps/web/.env.example`

Copy to `.env` / `.env.local` and adjust.

### Tests

```bash
# React + lib tests
pnpm -w run test

# Go tests
cd apps/api && make test
```

### Zip the repository

If your environment did not attach a zip automatically:

```bash
zip -r it-tms-monorepo.zip ./it-tms
```

### Notes

- Frontend uses **Next.js App Router**, **Tailwind CSS v4** and **HeroUI (`@heroui/react`)**.
- Backend uses **Go Fiber**, **pgx**, **bcrypt**, **zerolog**, secure middlewares, RBAC via JWT.
- OpenAPI is served at **`/api/docs`** (Swagger UI wrapper) and the spec at **`/openapi.yaml`**.
- `sqlc.yaml` and query files are provided; the current repository uses a repository layer with `pgx` directly. You can run `sqlc generate` to produce typed code and migrate repositories accordingly.
- CI via GitHub Actions installs Node+Go, starts Postgres service, runs migrations, lints, tests, and builds.

> Screenshots/GIFs can be added later in this README under `docs/`.