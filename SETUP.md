# IT-TMS Setup and Run Guide

## Overview

This is a production-ready IT Ticket Management System (IT-TMS) built as a monorepo with:
- **Frontend**: Next.js 15 with React 18, Tailwind CSS v3, and HeroUI
- **Backend**: Go Fiber API with PostgreSQL database
- **Database**: PostgreSQL with migrations and seeding
- **Infrastructure**: Docker Compose for local development

## Prerequisites

Ensure you have the following installed:
- **Node.js**: LTS version (>= 20)
- **pnpm**: 9.x (package manager)
- **Go**: Latest stable version (>= 1.22)
- **Docker** + **Docker Compose**
- **golang-migrate** CLI (for database migrations)

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies
pnpm install
```

### 2. Start Database

```bash
# Start PostgreSQL database
docker compose up -d db
```

### 3. Environment Setup

Create environment files (these are blocked by gitignore for security):

**For API (`apps/api/.env`):**
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/it_tms?sslmode=disable
PORT=8080
JWT_SECRET=dev-jwt-secret-key-change-in-production
CORS_ALLOWED_ORIGINS=http://localhost:3000
UPLOAD_DIR=uploads
SECURE_COOKIES=false
```

**For Web (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 4. Database Setup

```bash
# Navigate to API directory
cd apps/api

# Run migrations (requires golang-migrate)
make migrate-up

# Seed the database
make seed
```

### 5. Run Development Servers

```bash
# From project root - runs both web and API
pnpm dev
```

**Note**: The web server will start immediately, but the API server requires the database to be running first.

Or run individually:

```bash
# Terminal 1 - API server (requires database running)
cd apps/api
make run

# Terminal 2 - Web server  
cd apps/web
npm run dev
```

## Access Points

- **Web Application**: http://localhost:3000
- **Component Test Page**: http://localhost:3000/test
- **API**: http://localhost:8080
- **API Documentation**: http://localhost:8080/api/docs
- **OpenAPI Spec**: http://localhost:8080/openapi.yaml
- **Database Admin**: http://localhost:5050 (pgAdmin)

## Project Structure

```
it-tms/
├── apps/
│   ├── api/                 # Go Fiber API
│   │   ├── cmd/            # Application entry points
│   │   ├── internal/       # Internal packages
│   │   ├── pkg/           # Public packages
│   │   └── db/queries/    # SQL queries
│   └── web/               # Next.js frontend
│       ├── app/           # App Router pages
│       └── lib/           # Utility libraries
├── db/
│   └── migrations/        # Database migrations
├── packages/
│   ├── config/           # Shared configuration
│   └── ui/               # Shared UI components
└── docker-compose.yml    # Local development services
```

## Available Commands

### Root Level (Monorepo)
```bash
pnpm dev          # Start all services in development
pnpm build        # Build all applications
pnpm lint         # Lint all code
pnpm test         # Run all tests
pnpm format       # Format all code
pnpm typecheck    # Type check all TypeScript
```

### API Commands (`apps/api/`)
```bash
make run          # Start API server
make migrate-up   # Apply database migrations
make migrate-down # Rollback one migration
make seed         # Seed database with sample data
make test         # Run Go tests
```

### Web Commands (`apps/web/`)
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Lint code
npm run test      # Run tests
npm run format    # Format code
npm run typecheck # Type check
```

## Database Schema

The system includes these main entities:
- **Users**: Authentication and role management
- **Tickets**: Core ticket management with priority scoring
- **Comments**: Ticket discussions
- **Attachments**: File uploads
- **Audit Logs**: Change tracking

## Key Features

### Frontend
- Modern React with Next.js App Router
- Dark theme with HeroUI components
- Responsive design with Tailwind CSS
- Type-safe API integration
- Priority calculation wizard
- Ticket management interface

### Backend
- RESTful API with Go Fiber
- JWT authentication
- Role-based access control (RBAC)
- Database migrations
- File upload handling
- Comprehensive logging
- Rate limiting
- CORS configuration

### Database
- PostgreSQL with proper indexing
- UUID primary keys
- JSONB for flexible data storage
- Audit logging
- Foreign key constraints

## Troubleshooting

### Common Issues

1. **Port Variable Error**: If you see `'$PORT' is not a non-negative number`:
   - This is fixed in the current version
   - The scripts now use hardcoded port 3000 for the web server

2. **HeroUI Styling Issues**: If components appear unstyled:
   - Ensure Tailwind config includes HeroUI plugin: `plugins: [heroui()]`
   - Verify dark mode is enabled: `<html className="dark">`
   - Check that HeroUIProvider wraps your app
   - Test components at http://localhost:3000/test

3. **Go Dependencies**: If Go modules fail to download, try:
   ```bash
   cd apps/api
   go clean -modcache
   go mod download
   ```

2. **Database Connection**: Ensure PostgreSQL is running:
   ```bash
   docker compose up -d db
   ```

3. **Port Conflicts**: Default ports are 3000 (web) and 8080 (API). Change in environment files if needed.

4. **Build Failures**: Clear caches:
   ```bash
   # Web
   cd apps/web
   rm -rf .next
   npm run build
   
   # API
   cd apps/api
   go clean -cache
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | API server port | 8080 |
| `JWT_SECRET` | JWT signing secret | Required |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | http://localhost:3000 |
| `UPLOAD_DIR` | File upload directory | uploads |
| `SECURE_COOKIES` | Use secure cookies | false |

## Development Workflow

1. **Start Services**: `docker compose up -d db`
2. **Run Migrations**: `cd apps/api && make migrate-up`
3. **Start Development**: `pnpm dev`
4. **Make Changes**: Edit code in your preferred editor
5. **Test Changes**: Use the web interface or API directly
6. **Run Tests**: `pnpm test`

## Production Deployment

For production deployment:

1. Set secure environment variables
2. Use a production PostgreSQL instance
3. Configure proper CORS origins
4. Enable secure cookies
5. Set up proper logging
6. Configure reverse proxy (nginx/traefik)
7. Set up SSL certificates
8. Configure monitoring and alerting

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all builds pass before submitting

## Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Check the API documentation at `/api/docs`
4. Examine the database schema in `db/migrations/`
