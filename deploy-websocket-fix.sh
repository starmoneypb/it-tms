#!/bin/bash

# Quick deployment script to fix WebSocket issues
# This script updates the running server with the WebSocket fixes

set -e

echo "🚀 Deploying WebSocket fixes to unisight.dev..."

# Configuration
PROJECT_ID="unisight-472720"
ZONE="asia-southeast1-b"
INSTANCE_NAME="unisight-dev-vm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed and authenticated
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        echo_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo_error "You are not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    fi
    
    echo_info "gcloud CLI is installed and authenticated ✓"
}

# Deploy WebSocket fixes
deploy_fixes() {
    echo_info "Deploying WebSocket fixes to VM..."
    
    # Create a temporary script for deployment
    cat > /tmp/websocket_fix.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Applying WebSocket fixes..."

# Navigate to the application directory
cd /opt/unisight

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Rebuild and restart the API service
echo "🔨 Rebuilding API service..."
docker-compose -f docker-compose.gcp.yml build api

echo "🔄 Restarting API service..."
docker-compose -f docker-compose.gcp.yml up -d api

# Wait for the service to be ready
echo "⏳ Waiting for API service to be ready..."
sleep 30

# Check if the service is healthy
echo "🏥 Checking API health..."
curl -f http://localhost:8080/healthz || {
    echo "❌ API service is not healthy"
    exit 1
}

echo "✅ WebSocket fixes deployed successfully!"
echo "🔍 Testing WebSocket endpoint..."
curl -I -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Sec-WebSocket-Version: 13" http://localhost:8080/ws || echo "WebSocket endpoint test completed"
EOF

    # Copy script to VM and execute
    gcloud compute scp /tmp/websocket_fix.sh $INSTANCE_NAME:/tmp/websocket_fix.sh --zone=$ZONE
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="chmod +x /tmp/websocket_fix.sh && sudo /tmp/websocket_fix.sh"
    
    # Clean up
    rm /tmp/websocket_fix.sh
}

# Main deployment process
main() {
    echo_info "Starting WebSocket fix deployment..."
    
    check_gcloud
    gcloud config set project $PROJECT_ID
    
    deploy_fixes
    
    echo_info "🎉 WebSocket fixes deployed successfully!"
    echo_info "🌐 Test the WebSocket connection at: https://unisight.dev/ws"
}

# Run main function
main "$@"
