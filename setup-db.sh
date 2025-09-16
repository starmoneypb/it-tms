#!/bin/bash

# Database setup script for IT-TMS
# This script applies migrations and seeds the database

set -e

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-it_tms}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Wait for database to be ready
echo "Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Set PGPASSWORD for non-interactive connection
export PGPASSWORD="$DB_PASSWORD"

# Apply migrations
echo "Applying database migrations..."

# Apply initial schema
echo "Applying 0001_init.up.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/migrations/0001_init.up.sql

# Apply indexes
echo "Applying 0002_indexes.up.sql..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/migrations/0002_indexes.up.sql

echo "Migrations applied successfully!"

# Seed the database
echo "Seeding database..."
cd apps/api
go run cmd/seed/main.go

echo "Database setup complete!"

