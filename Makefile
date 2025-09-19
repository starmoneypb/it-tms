# Root Makefile for IT-TMS
# Provides convenient commands for database setup and development

.PHONY: setup-db clean-db up down logs

# Database setup using Docker
setup-db:
	@echo "Setting up database with Docker..."
	docker-compose up db-setup

# Clean database and restart
clean-db:
	@echo "Cleaning database..."
	docker-compose down -v
	docker-compose up -d db
	@echo "Waiting for database to be ready..."
	@timeout 30 bash -c 'until docker-compose exec db pg_isready -U postgres; do sleep 1; done'
	@echo "Setting up database..."
	$(MAKE) setup-db

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Manual database setup (requires local PostgreSQL)
setup-db-local:
	@echo "Setting up database locally..."
	cd apps/api && make setup-db

# Production-like environment
prod-like:
	@echo "Starting production-like environment..."
	docker-compose -f docker-compose.prod-like.yml --env-file env.prod-like up --build

# Stop production-like environment
prod-like-down:
	@echo "Stopping production-like environment..."
	docker-compose -f docker-compose.prod-like.yml down

# Clean production-like environment (remove volumes)
prod-like-clean:
	@echo "Cleaning production-like environment..."
	docker-compose -f docker-compose.prod-like.yml down -v
	docker system prune -f

