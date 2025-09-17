# Development Environment Startup Script
# This script will reset and start the development environment with proper migrations

Write-Host "🚀 Starting IT-TMS Development Environment" -ForegroundColor Green
Write-Host ""

# Stop and clean up existing containers
Write-Host "🧹 Cleaning up existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Build and start services
Write-Host "🏗️  Building and starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

Write-Host ""
Write-Host "✅ Development environment should be running!" -ForegroundColor Green
Write-Host "📱 Web App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 API: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🗄️  Database: localhost:5432" -ForegroundColor Cyan
Write-Host "🔍 pgAdmin: http://localhost:5050" -ForegroundColor Cyan
