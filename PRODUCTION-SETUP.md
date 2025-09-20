# Production-like Environment Setup Guide

This guide explains how to set up and run a production-like environment for the IT-TMS application on localhost.

## Overview

The production-like environment includes:
- **Next.js Frontend**: Optimized production build with internationalization
- **Go Fiber API**: Production-optimized binary with security features
- **PostgreSQL Database**: With migrations and seeded data
- **Nginx Reverse Proxy**: With rate limiting, security headers, and routing
- **Docker Compose**: Orchestrating all services with proper dependencies

## Prerequisites

- Docker and Docker Compose installed
- Make (optional, for convenience commands)
- At least 2GB RAM available for containers

## Quick Start

1. **Clone and navigate to the project**:
   ```bash
   cd it-tms
   ```

2. **Start the production-like environment**:
   ```bash
   # Using Make (recommended)
   make prod-like
   
   # Or using Docker Compose directly
   docker-compose -f docker-compose.prod-like.yml --env-file env.prod-like up --build
   ```

3. **Access the application**:
   - **Web Application**: http://localhost:8000
   - **API Health Check**: http://localhost:8000/healthz
   - **API Documentation**: Available via OpenAPI spec in the API container

## Architecture

### Service Architecture
```
[Internet] -> [Nginx:8000] -> [Next.js:3000] (Web UI)
                          -> [Go API:8080]   (Backend API)
                                          -> [PostgreSQL:5432] (Database)
```

### Container Details

| Service | Image | Purpose | Health Check |
|---------|-------|---------|--------------|
| nginx | nginx:1.25-alpine | Reverse proxy, load balancer | HTTP GET /healthz |
| web | it-tms-web | Next.js production build | HTTP GET / |
| api | it-tms-api | Go Fiber API server | HTTP GET /healthz |
| db | postgres:16-alpine | Database server | pg_isready |

## Configuration

### Environment Variables

The production-like environment uses `env.prod-like` file:

```env
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_postgres_password_123
POSTGRES_DB=it_tms

# API Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random_for_production_testing_12345
CORS_ALLOWED_ORIGINS=http://localhost:8000

# Web Configuration  
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Security
SECURE_COOKIES=false  # Set to true for HTTPS in real production
```

### Nginx Configuration

The Nginx reverse proxy is configured with:
- **Rate Limiting**: 10 req/s for API, 30 req/s for web
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Gzip Compression**: For text-based content
- **Upstream Load Balancing**: With keepalive connections

### Database Setup

The environment automatically:
1. **Runs Migrations**: Applies all SQL migrations in order
2. **Seeds Data**: Creates demo users and initial data
3. **Health Checks**: Ensures database is ready before starting dependent services

### Demo Users

The following demo users are available:

| Email | Role | Password |
|-------|------|----------|
| peachchan@demo.com | Manager | Password!1 |
| saroge@demo.com | Supervisor | Password!1 |
| manit@demo.com | User | Password!1 |

## Production Optimizations

### Next.js Optimizations
- **Production Build**: `next build` with optimizations
- **Static Generation**: Pre-rendered pages where possible
- **Image Optimization**: Built-in Next.js image optimization
- **Bundle Analysis**: Optimized bundle sizes
- **Internationalization**: English and Thai language support

### Go API Optimizations
- **Binary Optimization**: Built with `-ldflags="-w -s"` for smaller size
- **Alpine Linux**: Minimal base image for security
- **Non-root User**: Runs as unprivileged user
- **Resource Limits**: CPU and memory constraints
- **Health Checks**: Built-in health monitoring

### Security Features
- **CORS Configuration**: Proper origin restrictions
- **Security Headers**: Comprehensive security headers via Nginx
- **Rate Limiting**: Protection against abuse
- **JWT Authentication**: Secure token-based auth
- **File Upload Security**: Secure file handling with path validation

### Performance Features
- **Connection Pooling**: Database connection pooling
- **HTTP/2 Support**: Via Nginx (when using HTTPS)
- **Gzip Compression**: Reduced bandwidth usage
- **Keepalive Connections**: Reduced connection overhead
- **Resource Constraints**: Prevents resource exhaustion

## Management Commands

### Start/Stop Services
```bash
# Start all services
make prod-like

# Stop all services  
make prod-like-down

# Clean up (removes volumes)
make prod-like-clean
```

### Individual Service Management
```bash
# Restart specific service
docker-compose -f docker-compose.prod-like.yml restart nginx

# View logs
docker-compose -f docker-compose.prod-like.yml logs -f api

# Execute commands in containers
docker exec -it it-tms-api-1 /bin/sh
```

### Database Operations
```bash
# Connect to database
docker exec -it it-tms-db-1 psql -U postgres -d it_tms

# Check database status
docker exec it-tms-db-1 pg_isready -U postgres

# View database logs
docker logs it-tms-db-1
```

## Testing the Environment

### Health Checks
```bash
# Test Nginx reverse proxy
curl http://localhost:8000/healthz

# Test API directly  
curl http://localhost:8000/api/v1/me

# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"peachchan@demo.com","password":"Password!1"}'
```

### Web Interface Testing
1. Navigate to http://localhost:8000
2. Should redirect to http://localhost:8000/en (English locale)
3. Click sign-in and use demo credentials
4. Verify dashboard and ticket functionality

### API Testing
```bash
# Get tickets (anonymous access)
curl http://localhost:8000/api/v1/tickets

# Get user rankings
curl http://localhost:8000/api/v1/rankings

# Test metrics endpoint
curl http://localhost:8000/api/v1/metrics/summary
```

## Troubleshooting

### Common Issues

#### Port Conflicts
If port 8000 is in use, modify `docker-compose.prod-like.yml`:
```yaml
nginx:
  ports:
    - "8001:80"  # Change to available port
```

#### Database Connection Issues
```bash
# Check database health
docker exec it-tms-db-1 pg_isready -U postgres

# View database logs
docker logs it-tms-db-1

# Restart database
docker-compose -f docker-compose.prod-like.yml restart db
```

#### API Issues
```bash
# Check API logs
docker logs it-tms-api-1

# Test API health directly
docker exec it-tms-api-1 wget -qO- http://localhost:8080/healthz

# Rebuild API
docker-compose -f docker-compose.prod-like.yml build api --no-cache
```

#### Web Build Issues
```bash
# Check web build logs
docker logs it-tms-web-1

# Rebuild web service
docker-compose -f docker-compose.prod-like.yml build web --no-cache
```

### Performance Tuning

#### Resource Limits
Adjust in `docker-compose.prod-like.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 1G        # Increase if needed
      cpus: '1.0'       # Increase if needed
```

#### Database Performance
```sql
-- Check database performance
SELECT * FROM pg_stat_activity;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM tickets;
```

### Monitoring

#### Container Stats
```bash
# View resource usage
docker stats

# View container details
docker inspect it-tms-api-1
```

#### Log Monitoring
```bash
# Follow all logs
docker-compose -f docker-compose.prod-like.yml logs -f

# Follow specific service
docker-compose -f docker-compose.prod-like.yml logs -f api
```

## Differences from Development

| Aspect | Development | Production-like |
|--------|-------------|-----------------|
| Build | Development build | Production build |
| Hot Reload | Enabled | Disabled |
| Source Maps | Enabled | Disabled |
| Debugging | Enabled | Minimal |
| Resource Usage | Higher | Optimized |
| Security | Relaxed | Hardened |
| Monitoring | Basic | Comprehensive |

## Next Steps for Real Production

1. **HTTPS/TLS**: Configure SSL certificates
2. **Domain Setup**: Configure proper domain names
3. **Environment Secrets**: Use proper secret management
4. **Monitoring**: Add Prometheus/Grafana
5. **Logging**: Centralized logging solution
6. **Backups**: Database backup strategy
7. **CI/CD**: Automated deployment pipeline
8. **Load Testing**: Performance validation
9. **Security Audit**: Penetration testing
10. **Documentation**: API documentation and runbooks

## Support

For issues with this setup:
1. Check the troubleshooting section
2. Review container logs
3. Verify environment configuration
4. Test individual components

The production-like environment is designed to closely mirror real production while being suitable for local development and testing.

