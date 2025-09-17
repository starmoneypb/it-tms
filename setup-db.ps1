# Database setup script for IT-TMS (PowerShell version)
# This script applies migrations and seeds the database

param(
    [string]$DB_HOST = "localhost",
    [int]$DB_PORT = 5432,
    [string]$DB_NAME = "it_tms",
    [string]$DB_USER = "postgres",
    [string]$DB_PASSWORD = "postgres"
)

# Function to wait for database
function Wait-ForDatabase {
    Write-Host "Waiting for database to be ready..."
    do {
        try {
            $connection = New-Object System.Data.SqlClient.SqlConnection
            $connection.ConnectionString = "Server=$DB_HOST,$DB_PORT;Database=$DB_NAME;User Id=$DB_USER;Password=$DB_PASSWORD;"
            $connection.Open()
            $connection.Close()
            Write-Host "Database is ready!"
            return
        }
        catch {
            Write-Host "Database is unavailable - sleeping"
            Start-Sleep -Seconds 2
        }
    } while ($true)
}

# Wait for database
Wait-ForDatabase

# Set environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

# Apply migrations
Write-Host "Applying database migrations..."

# Apply initial schema
Write-Host "Applying 0001_init.up.sql..."
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrations/0001_init.up.sql

# Apply indexes
Write-Host "Applying 0002_indexes.up.sql..."
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrations/0002_indexes.up.sql

# Apply profile picture migration
Write-Host "Applying 0003_add_profile_picture.up.sql..."
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrations/0003_add_profile_picture.up.sql

# Apply multiple assignees migration
Write-Host "Applying 0004_multiple_assignees.up.sql..."
& psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrations/0004_multiple_assignees.up.sql

Write-Host "Migrations applied successfully!"

# Seed the database
Write-Host "Seeding database..."
Set-Location apps/api
& go run cmd/seed/main.go
Set-Location ../..

Write-Host "Database setup complete!"

