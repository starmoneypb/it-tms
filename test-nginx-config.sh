#!/bin/bash

# Test and Apply Nginx Configuration
echo "🔧 Testing and applying nginx configuration..."

# Test nginx configuration
echo "📋 Testing nginx configuration..."
if command -v nginx &> /dev/null; then
    nginx -t
    if [ $? -eq 0 ]; then
        echo "✅ Nginx configuration is valid"
        echo "🔄 Reloading nginx..."
        nginx -s reload
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx configuration has errors"
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "🐳 Testing nginx configuration in Docker..."
    NGINX_CONTAINER=$(docker ps | grep nginx | awk '{print $1}')
    if [ ! -z "$NGINX_CONTAINER" ]; then
        docker exec $NGINX_CONTAINER nginx -t
        if [ $? -eq 0 ]; then
            echo "✅ Nginx configuration is valid"
            echo "🔄 Reloading nginx in container..."
            docker exec $NGINX_CONTAINER nginx -s reload
            echo "✅ Nginx reloaded successfully"
        else
            echo "❌ Nginx configuration has errors"
            docker exec $NGINX_CONTAINER nginx -t
            exit 1
        fi
    else
        echo "⚠️  Nginx container not found"
    fi
else
    echo "⚠️  Neither nginx nor docker found"
fi

echo ""
echo "🧪 Testing endpoints..."

# Test API connectivity
echo "Testing API connectivity..."
if curl -s -f "https://unisight.dev/api/v1/me" > /dev/null; then
    echo "✅ API /me endpoint working"
else
    echo "❌ API /me endpoint not working"
fi

# Test uploads endpoint specifically
echo "Testing uploads endpoint routing..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://unisight.dev/api/v1/uploads/test.jpg")
if [ "$HTTP_CODE" = "404" ]; then
    # Check if it's returning API 404 or Next.js 404
    RESPONSE=$(curl -s "https://unisight.dev/api/v1/uploads/test.jpg")
    if echo "$RESPONSE" | grep -q "Next.js"; then
        echo "❌ Uploads endpoint still routing to Next.js (HTTP $HTTP_CODE)"
    else
        echo "✅ Uploads endpoint routing to API server (HTTP $HTTP_CODE - expected for missing file)"
    fi
else
    echo "📊 Uploads endpoint returned HTTP $HTTP_CODE"
fi

echo ""
echo "🔍 Debugging info:"
echo "Current nginx processes:"
ps aux | grep nginx | grep -v grep || echo "No nginx processes found"

echo ""
echo "Docker containers:"
docker ps | grep -E "(nginx|api)" || echo "No relevant containers found"

echo ""
echo "✅ Configuration test complete!"
