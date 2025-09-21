#!/bin/bash

echo "=== SVG Debug Script ==="
echo "Testing logo.svg serving at each layer..."
echo

echo "1. Testing if logo.svg exists in web container:"
sudo docker-compose -f docker-compose.gcp.yml exec web sh -c "ls -la /app/apps/web/public/logo.svg 2>/dev/null && echo 'FILE EXISTS' || echo 'FILE MISSING'"
echo

echo "2. Testing Next.js direct serving (inside web container):"
sudo docker-compose -f docker-compose.gcp.yml exec web sh -c "curl -sI http://localhost:3000/logo.svg | head -5"
echo

echo "3. Testing nginx proxy to web (from nginx container):"
sudo docker-compose -f docker-compose.gcp.yml exec nginx sh -c "curl -sI http://web:3000/logo.svg | head -5"
echo

echo "4. Testing external HTTPS request:"
curl -sI https://unisight.dev/logo.svg | head -5
echo

echo "5. Testing if middleware is being called (check logs):"
echo "Recent web container logs:"
sudo docker-compose -f docker-compose.gcp.yml logs web --tail=20 | grep -i "logo\|svg\|middleware" || echo "No relevant logs found"
echo

echo "6. Testing nginx location block matching:"
echo "Nginx config test for SVG pattern:"
sudo docker-compose -f docker-compose.gcp.yml exec nginx sh -c "nginx -T 2>/dev/null | grep -A 5 -B 5 'svg' || echo 'No SVG patterns found'"
