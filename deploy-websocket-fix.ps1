# Quick deployment script to fix WebSocket issues
# This script updates the running server with the WebSocket fixes

param(
    [string]$ProjectId = "unisight-472720",
    [string]$Zone = "asia-southeast1-b",
    [string]$InstanceName = "unisight-dev-vm"
)

# Colors for output
function Write-Info { 
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red 
}

# Check if gcloud is installed and authenticated
function Test-GCloud {
    Write-Info "Checking gcloud CLI installation..."
    
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "gcloud CLI is not installed. Please install it first from: https://cloud.google.com/sdk/docs/install"
        exit 1
    }
    
    $authList = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $authList) {
        Write-Error "You are not authenticated with gcloud. Please run 'gcloud auth login' first."
        exit 1
    }
    
    Write-Info "gcloud CLI is installed and authenticated ✓"
}

# Deploy WebSocket fixes
function Deploy-WebSocketFixes {
    Write-Info "Deploying WebSocket fixes to VM..."
    
    # Create a temporary script for deployment
    $deployScript = @"
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
"@

    # Write script to temporary file
    $tempFile = [System.IO.Path]::GetTempFileName()
    $deployScript | Out-File -FilePath $tempFile -Encoding UTF8
    
    try {
        # Copy script to VM and execute
        Write-Info "Copying deployment script to VM..."
        gcloud compute scp $tempFile "$InstanceName`:/tmp/websocket_fix.sh" --zone=$Zone
        
        Write-Info "Executing deployment script on VM..."
        gcloud compute ssh $InstanceName --zone=$Zone --command="chmod +x /tmp/websocket_fix.sh && sudo /tmp/websocket_fix.sh"
        
        Write-Info "🎉 WebSocket fixes deployed successfully!"
        Write-Info "🌐 Test the WebSocket connection at: https://unisight.dev/ws"
    }
    finally {
        # Clean up temporary file
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
}

# Main deployment process
function Start-WebSocketFixDeployment {
    Write-Info "🚀 Starting WebSocket fix deployment..."
    
    Test-GCloud
    gcloud config set project $ProjectId
    
    Deploy-WebSocketFixes
}

# Run the deployment
Start-WebSocketFixDeployment
