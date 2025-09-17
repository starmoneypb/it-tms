# Docker Environments

This project supports two distinct Docker environments: development and production.

## Development Environment

The development environment includes hot reload functionality for both the API and web applications.

### Features
- **Hot Reload**: Automatic restart/refresh when code changes are detected
- **Volume Mounts**: Source code is mounted for live editing
- **Development Tools**: Includes debugging and development utilities
- **Database Tools**: pgAdmin for database management
- **Database Seeding**: Automatic database setup and seeding

### Usage
```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Start with specific services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up db api web

# Build and start (force rebuild)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop and remove containers
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Development Services
- **Database**: PostgreSQL 16 (port 5432)
- **API**: Go API with Air hot reload (port 8080)
- **Web**: Next.js with hot reload (port 3000)
- **pgAdmin**: Database management UI (port 5050)
- **Database Setup**: Automatic migrations and seeding

### Hot Reload Details

#### API (Go)
- Uses [Air](https://github.com/cosmtrek/air) for hot reload
- Watches `.go` files and rebuilds automatically
- Source code mounted at `/app`
- Go modules cached in named volume

#### Web (Next.js)
- Uses Next.js built-in dev server
- File watching enabled with polling for Docker compatibility
- Source code mounted with node_modules exclusions
- pnpm cache stored in named volume

## Production Environment

The production environment is optimized for deployment with security and performance considerations.

### Features
- **Optimized Builds**: Multi-stage builds for smaller images
- **Security**: Non-root users, minimal attack surface
- **Resource Limits**: Memory and CPU constraints
- **No Port Exposure**: Services communicate internally
- **Environment Variables**: Configurable via `.env` files

### Usage
```bash
# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Stop and remove
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Production Configuration

#### Environment Variables
Create a `.env` file with production values:
```bash
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=it_tms
DATABASE_URL=postgres://user:pass@db:5432/it_tms?sslmode=require
JWT_SECRET=your_jwt_secret_key
CORS_ALLOWED_ORIGINS=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

#### Resource Limits
- **API**: 512MB RAM, 0.5 CPU cores
- **Web**: 256MB RAM, 0.25 CPU cores
- **Database**: No limits (configure as needed)

#### Security Features
- No exposed ports (use reverse proxy)
- Non-root users in containers
- Minimal base images
- Health checks enabled

## File Structure

```
├── docker-compose.yml          # Base configuration
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.prod.yml     # Production overrides
├── apps/
│   ├── api/
│   │   ├── Dockerfile          # Production API image
│   │   └── Dockerfile.dev      # Development API image
│   └── web/
│       ├── Dockerfile          # Production web image
│       └── Dockerfile.dev      # Development web image
```

## Troubleshooting

### Development Issues

**Hot reload not working:**
- Ensure volumes are properly mounted
- Check file permissions on host system
- Try rebuilding containers: `docker-compose ... up --build`

**Port conflicts:**
- Check if ports 3000, 8080, 5432, or 5050 are in use
- Modify port mappings in `docker-compose.dev.yml`

**Database connection issues:**
- Wait for database health check to pass
- Check database logs: `docker-compose ... logs db`

### Production Issues

**Environment variables:**
- Ensure all required environment variables are set
- Use docker-compose config to validate configuration

**Resource constraints:**
- Monitor container resources: `docker stats`
- Adjust limits in `docker-compose.prod.yml`

**Networking:**
- Verify reverse proxy configuration
- Check internal service communication

## Best Practices

### Development
- Use `docker-compose ... down -v` to reset database state
- Regularly rebuild images to get latest dependencies
- Use `.dockerignore` to exclude unnecessary files

### Production
- Use specific image tags instead of `latest`
- Implement proper logging and monitoring
- Regular security updates for base images
- Backup database volumes regularly
