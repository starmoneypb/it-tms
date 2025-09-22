#!/bin/bash

# Debug Upload Issues Script
echo "🔍 Debugging profile picture upload issues..."

echo ""
echo "📁 Checking upload directories and files..."

# Check local uploads directory
echo "Local uploads directory:"
if [ -d "apps/api/uploads" ]; then
    echo "✅ apps/api/uploads exists"
    echo "Files in local uploads:"
    ls -la apps/api/uploads/ | head -10
    echo "Recent files with timestamp 1758504:"
    find apps/api/uploads/ -name "*1758504*" 2>/dev/null || echo "No files found with timestamp 1758504"
else
    echo "❌ apps/api/uploads does not exist"
fi

echo ""
echo "🐳 Checking Docker container uploads..."

# Check API container uploads directory
API_CONTAINER=$(docker ps | grep api | awk '{print $1}' | head -1)
if [ ! -z "$API_CONTAINER" ]; then
    echo "✅ Found API container: $API_CONTAINER"
    echo "Files in API container uploads directory:"
    docker exec $API_CONTAINER ls -la /app/uploads/ 2>/dev/null || echo "Could not access /app/uploads in container"
    
    echo "Checking for recent uploads in container:"
    docker exec $API_CONTAINER find /app/uploads/ -name "*1758504*" 2>/dev/null || echo "No recent files found in container"
    
    echo "Container environment:"
    docker exec $API_CONTAINER env | grep -E "(UPLOAD_DIR|GO_ENV)" || echo "No relevant env vars found"
    
    echo "Container working directory and uploads setup:"
    docker exec $API_CONTAINER pwd
    docker exec $API_CONTAINER ls -la /app/ | grep uploads || echo "No uploads directory visible in /app/"
else
    echo "❌ API container not found"
fi

echo ""
echo "🔗 Testing API endpoints..."

# Test the uploads endpoint with a known file
echo "Testing uploads endpoint routing:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://unisight.dev/api/v1/uploads/test.jpg")
echo "HTTP response code: $HTTP_CODE"

if [ "$HTTP_CODE" = "404" ]; then
    echo "Getting detailed 404 response:"
    curl -s "https://unisight.dev/api/v1/uploads/test.jpg" | head -5
fi

echo ""
echo "📊 Testing recent upload:"
RECENT_FILE="1758504917164742307_EMP001446%20(1).png"
echo "Testing URL: https://unisight.dev/api/v1/uploads/$RECENT_FILE"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://unisight.dev/api/v1/uploads/$RECENT_FILE")
echo "HTTP response code: $HTTP_CODE"

if [ "$HTTP_CODE" = "404" ]; then
    echo "Getting detailed response:"
    curl -s "https://unisight.dev/api/v1/uploads/$RECENT_FILE"
fi

echo ""
echo "🔧 Checking Docker volume mounts..."
if [ ! -z "$API_CONTAINER" ]; then
    echo "API container volume mounts:"
    docker inspect $API_CONTAINER | grep -A 10 -B 5 "Mounts" || echo "Could not inspect container mounts"
fi

echo ""
echo "✅ Debug complete!"
echo ""
echo "📋 Summary:"
echo "1. Check if files exist in the container's uploads directory"
echo "2. Verify volume mounts are correct"
echo "3. Check if UPLOAD_DIR environment variable is set correctly"
echo "4. Ensure file permissions allow read access"
