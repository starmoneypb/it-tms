# Production Deployment Guide

## Pre-deployment Checklist

### Security
- [ ] All environment variables are set securely
- [ ] JWT_SECRET is at least 32 characters and randomly generated
- [ ] Database credentials are strong and unique
- [ ] CORS_ALLOWED_ORIGINS is properly configured
- [ ] SSL/TLS certificates are configured
- [ ] Security headers are implemented

### Dependencies
- [ ] All dependencies are up to date
- [ ] No known security vulnerabilities (run `pnpm audit` and `go mod audit`)
- [ ] Docker images are built from latest base images

### Testing
- [ ] All tests pass (`pnpm test` and `go test`)
- [ ] Code coverage meets minimum thresholds (70%)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)

### Database
- [ ] Migrations are tested and ready
- [ ] Database backup strategy is in place
- [ ] Connection pooling is configured
- [ ] SSL connections are enabled

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
POSTGRES_USER=your_production_user
POSTGRES_PASSWORD=your_strong_password
POSTGRES_DB=it_tms_prod
DATABASE_URL=postgres://user:password@db:5432/it_tms_prod?sslmode=require

# API
JWT_SECRET=your_32_character_random_secret_key_here
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=8080

# Web
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

## Deployment Steps

### 1. Build and Test
```bash
# Install dependencies
pnpm install

# Run tests
pnpm test
pnpm lint
pnpm typecheck

# Build applications
pnpm build
cd apps/api && go build -o server ./cmd/server
```

### 2. Database Setup
```bash
# Run migrations
cd apps/api
make migrate-up DB_URL="your_production_database_url"

# Seed initial data (if needed)
make seed DB_URL="your_production_database_url"
```

### 3. Docker Deployment
```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 4. Health Checks
```bash
# Check API health
curl https://api.yourdomain.com/health

# Check web application
curl https://yourdomain.com/api/health
```

## Monitoring and Maintenance

### Logs
```bash
# View application logs
docker-compose logs -f api
docker-compose logs -f web

# View database logs
docker-compose logs -f db
```

### Updates
```bash
# Update dependencies
pnpm update

# Rebuild and redeploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Backups
```bash
# Database backup
docker-compose exec db pg_dump -U postgres it_tms_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T db psql -U postgres it_tms_prod < backup_file.sql
```

## Security Considerations

1. **Use a reverse proxy** (nginx/traefik) for SSL termination
2. **Enable firewall** and restrict access to necessary ports only
3. **Regular security updates** for base images and dependencies
4. **Monitor logs** for suspicious activities
5. **Implement rate limiting** at the reverse proxy level
6. **Use secrets management** for sensitive data

## Performance Optimization

1. **Enable gzip compression** in reverse proxy
2. **Use CDN** for static assets
3. **Implement caching** strategies
4. **Monitor resource usage** and scale as needed
5. **Use connection pooling** for database connections

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check DATABASE_URL format
   - Verify database is running and accessible
   - Check SSL configuration

2. **CORS errors**
   - Verify CORS_ALLOWED_ORIGINS includes your domain
   - Check if API and web are on different domains

3. **Build failures**
   - Check Node.js and Go versions
   - Verify all dependencies are installed
   - Check for TypeScript errors

### Debug Commands
```bash
# Check container status
docker-compose ps

# Check container logs
docker-compose logs [service_name]

# Execute commands in running container
docker-compose exec [service_name] [command]

# Check resource usage
docker stats
```
