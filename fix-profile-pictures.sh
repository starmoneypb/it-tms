#!/bin/bash

# Profile Picture Fix Script
# This script applies all the fixes for profile picture issues

set -e

echo "🔧 Fixing Profile Picture Issues..."

# Step 1: Clean up database (remove references to missing files)
echo "📊 Cleaning up database..."
if command -v docker &> /dev/null; then
    # If running in Docker
    if docker ps | grep -q postgres; then
        echo "Running database cleanup via Docker..."
        docker exec -i $(docker ps | grep postgres | awk '{print $1}') psql -U postgres -d it_tms < fix-profile-pictures.sql
    else
        echo "⚠️  PostgreSQL container not found. Please run the SQL manually:"
        echo "   psql -U postgres -d it_tms < fix-profile-pictures.sql"
    fi
else
    echo "⚠️  Docker not found. Please run the SQL manually:"
    echo "   psql -U postgres -d it_tms < fix-profile-pictures.sql"
fi

# Step 2: Restart nginx to apply configuration changes
echo "🔄 Restarting nginx..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q nginx; then
        docker exec $(docker ps | grep nginx | awk '{print $1}') nginx -t
        docker exec $(docker ps | grep nginx | awk '{print $1}') nginx -s reload
        echo "✅ Nginx configuration reloaded"
    else
        echo "⚠️  Nginx container not found"
    fi
else
    echo "⚠️  Docker not found. Please restart nginx manually"
fi

# Step 3: Restart API server to apply code changes
echo "🔄 Restarting API server..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q api; then
        docker restart $(docker ps | grep api | awk '{print $1}')
        echo "✅ API server restarted"
    else
        echo "⚠️  API container not found"
    fi
else
    echo "⚠️  Docker not found. Please restart API server manually"
fi

# Step 4: Test the fixes
echo "🧪 Testing profile picture functionality..."

# Test API connectivity
if curl -s -f "https://unisight.dev/api/v1/me" > /dev/null; then
    echo "✅ API server is accessible"
else
    echo "❌ API server is not accessible"
fi

# Test uploads endpoint
if curl -s -I "https://unisight.dev/api/v1/uploads/test.jpg" | grep -q "HTTP/1.1"; then
    echo "✅ Uploads endpoint is responding"
else
    echo "❌ Uploads endpoint is not responding"
fi

echo "🎉 Profile picture fixes applied!"
echo ""
echo "📝 Next steps:"
echo "1. Visit your profile page to upload a new profile picture"
echo "2. Check the browser console for any remaining errors"
echo "3. Verify that profile pictures display correctly in navigation"
echo ""
echo "🔍 If issues persist, check the logs:"
echo "   docker logs <api_container_name>"
echo "   docker logs <nginx_container_name>"
