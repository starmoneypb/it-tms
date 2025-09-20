#!/bin/bash

# IT-TMS Production Deployment Script
# This script handles the complete deployment process with proper error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/unisight"
COMPOSE_FILE="docker-compose.gcp.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/unisight-deployment.log"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed"
        exit 1
    fi
    
    # Check if project directory exists
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "Project directory $PROJECT_DIR does not exist"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create timestamp for backup
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="unisight_backup_$TIMESTAMP"
    
    # Create database backup
    if docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps | grep -q "unisight-db-1.*Up"; then
        log "Creating database backup..."
        docker exec unisight-db-1 pg_dump -U postgres it_tms > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"
        success "Database backup created: $BACKUP_DIR/${BACKUP_NAME}_db.sql"
    else
        warning "Database container not running, skipping database backup"
    fi
    
    # Create application backup (uploads and configs)
    log "Creating application backup..."
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" -C "$PROJECT_DIR" \
        apps/api/uploads/ \
        .env \
        docker-compose.gcp.yml \
        nginx/ 2>/dev/null || warning "Some files may not exist for backup"
    
    success "Application backup created: $BACKUP_DIR/${BACKUP_NAME}_app.tar.gz"
}

# Update application code
update_code() {
    log "Updating application code..."
    
    cd "$PROJECT_DIR"
    
    # Stash any local changes
    if git status --porcelain | grep -q .; then
        warning "Local changes detected, stashing them..."
        git stash push -m "Auto-stash before deployment $(date)"
    fi
    
    # Pull latest changes
    git fetch origin
    git pull origin main
    
    success "Code updated successfully"
}

# Build and deploy services
deploy_services() {
    log "Building and deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Stop services gracefully
    log "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down --timeout 30
    
    # Build images with no cache for web service (to pick up environment changes)
    log "Building web service with fresh environment variables..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache web
    
    # Build other services
    log "Building other services..."
    docker-compose -f "$COMPOSE_FILE" build api
    
    # Start database first
    log "Starting database..."
    docker-compose -f "$COMPOSE_FILE" up -d db
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose -f "$0" exec db pg_isready -U postgres; do sleep 2; done' "$COMPOSE_FILE" || {
        error "Database failed to start within 60 seconds"
        exit 1
    }
    
    # Run migrations
    log "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" up --no-deps db-migrate
    
    # Seed database if needed
    log "Seeding database..."
    docker-compose -f "$COMPOSE_FILE" up --no-deps db-seed
    
    # Start API
    log "Starting API service..."
    docker-compose -f "$COMPOSE_FILE" up -d api
    
    # Wait for API to be ready
    log "Waiting for API to be ready..."
    timeout 60 bash -c 'until docker-compose -f "$0" exec api curl -f http://localhost:8080/healthz; do sleep 2; done' "$COMPOSE_FILE" || {
        error "API failed to start within 60 seconds"
        exit 1
    }
    
    # Start web service
    log "Starting web service..."
    docker-compose -f "$COMPOSE_FILE" up -d web
    
    # Wait for web to be ready
    log "Waiting for web service to be ready..."
    sleep 10  # Give web service time to start
    
    # Start nginx
    log "Starting nginx..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx
    
    # Start certbot for certificate renewal
    log "Starting certbot..."
    docker-compose -f "$COMPOSE_FILE" up -d certbot
    
    success "All services deployed successfully"
}

# Health checks
run_health_checks() {
    log "Running health checks..."
    
    # Check if all containers are running
    log "Checking container status..."
    if ! docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some containers are not running"
        docker-compose -f "$PROJECT_DIR/$COMPOSE_FILE" ps
        exit 1
    fi
    
    # Check database connectivity
    log "Checking database connectivity..."
    if ! docker exec unisight-db-1 pg_isready -U postgres; then
        error "Database is not ready"
        exit 1
    fi
    
    # Check API health
    log "Checking API health..."
    sleep 5  # Give services time to fully start
    if ! curl -f http://localhost/api/v1/healthz &>/dev/null; then
        warning "API health check failed, checking if it's available via nginx..."
        if ! curl -f https://unisight.dev/api/v1/healthz &>/dev/null; then
            error "API is not responding to health checks"
            exit 1
        fi
    fi
    
    # Check HTTPS
    log "Checking HTTPS..."
    if ! curl -f https://unisight.dev/healthz &>/dev/null; then
        error "HTTPS is not working"
        exit 1
    fi
    
    success "All health checks passed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting IT-TMS production deployment..."
    
    check_permissions
    check_prerequisites
    create_backup
    update_code
    deploy_services
    run_health_checks
    cleanup
    
    success "🎉 Deployment completed successfully!"
    log "Application is available at: https://unisight.dev"
    log "Backup created in: $BACKUP_DIR"
    log "Deployment log: $LOG_FILE"
}

# Trap to handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
