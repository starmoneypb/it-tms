#!/bin/bash

# SSL Certificate Setup Script for Unisight
# Run this manually if automatic SSL generation fails

set -e

echo "🔒 Setting up SSL certificates for unisight.dev..."

# Navigate to project directory
cd /opt/unisight

# Stop nginx temporarily
echo "Stopping nginx temporarily..."
sudo docker-compose -f docker-compose.gcp.yml stop nginx || true

# Generate SSL certificates using standalone method
echo "Generating SSL certificates from Let's Encrypt..."
sudo docker run --rm -p 80:80 -v certbot-etc:/etc/letsencrypt -v certbot-var:/var/lib/letsencrypt certbot/certbot certonly --standalone -d unisight.dev -d www.unisight.dev --email admin@unisight.dev --agree-tos --non-interactive --expand

# Check if certificates were generated
if [ -f '/etc/letsencrypt/live/unisight.dev/fullchain.pem' ]; then
    echo "✅ SSL certificates generated successfully!"
    
    # Update nginx configuration to use SSL
    echo "Updating nginx configuration for SSL..."
    sudo cp nginx/nginx-ssl.conf nginx/nginx.conf
    
    # Start nginx with SSL configuration
    echo "Starting nginx with SSL configuration..."
    sudo docker-compose -f docker-compose.gcp.yml up -d nginx
    
    echo "🎉 SSL setup completed! Your site is now accessible via HTTPS"
    echo "   https://unisight.dev"
    echo "   https://www.unisight.dev"
else
    echo "❌ SSL certificate generation failed!"
    echo "   Please check:"
    echo "   1. Domain DNS points to this server's IP"
    echo "   2. Port 80 is accessible from the internet"
    echo "   3. No other services are using port 80"
    
    # Start nginx with HTTP-only configuration
    echo "Starting nginx with HTTP-only configuration..."
    sudo docker-compose -f docker-compose.gcp.yml up -d nginx
fi

echo "Checking service status..."
sudo docker-compose -f docker-compose.gcp.yml ps
