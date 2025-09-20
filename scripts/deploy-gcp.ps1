# GCP Deployment Script for unisight.dev (Windows PowerShell)
# This script automates the deployment process on Google Cloud Platform

param(
    [string]$ProjectId = "unisight-472720",
    [string]$Region = "asia-southeast1",
    [string]$Zone = "asia-southeast1-b",
    [string]$InstanceName = "unisight-dev-vm",
    [string]$MachineType = "e2-standard-2",
    [string]$BootDiskSize = "30GB",
    [string]$Domain = "unisight.dev"
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

# Set the GCP project
function Set-GcpProject {
    Write-Info "Setting GCP project to $ProjectId..."
    gcloud config set project $ProjectId
    
    # Enable required APIs
    Write-Info "Enabling required GCP APIs..."
    gcloud services enable compute.googleapis.com
    gcloud services enable dns.googleapis.com
    gcloud services enable logging.googleapis.com
    gcloud services enable monitoring.googleapis.com
}

# Create firewall rules
function New-FirewallRules {
    Write-Info "Creating firewall rules..."
    
    # Allow HTTP traffic
    $httpRule = gcloud compute firewall-rules describe allow-http 2>$null
    if (-not $httpRule) {
        gcloud compute firewall-rules create allow-http --allow tcp:80 --source-ranges 0.0.0.0/0 --description "Allow HTTP traffic"
    }
    
    # Allow HTTPS traffic
    $httpsRule = gcloud compute firewall-rules describe allow-https 2>$null
    if (-not $httpsRule) {
        gcloud compute firewall-rules create allow-https --allow tcp:443 --source-ranges 0.0.0.0/0 --description "Allow HTTPS traffic"
    }
    
    # Allow SSH
    $sshRule = gcloud compute firewall-rules describe allow-ssh 2>$null
    if (-not $sshRule) {
        gcloud compute firewall-rules create allow-ssh --allow tcp:22 --source-ranges 0.0.0.0/0 --description "Allow SSH access"
    }
}

# Create VM instance
function New-VmInstance {
    Write-Info "Creating VM instance: $InstanceName..."
    
    $existingInstance = gcloud compute instances describe $InstanceName --zone=$Zone 2>$null
    if ($existingInstance) {
        Write-Warning "Instance $InstanceName already exists. Skipping creation."
        return
    }
    
    $startupScript = @"
#!/bin/bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)`-`$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git and other tools
apt-get install -y git curl wget unzip

# Create app directory
mkdir -p /opt/unisight
chown ubuntu:ubuntu /opt/unisight

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo "export PATH=`$PATH:/usr/local/go/bin" >> /etc/profile

echo "VM setup completed" >> /var/log/startup.log
"@
    
    gcloud compute instances create $InstanceName `
        --zone=$Zone `
        --machine-type=$MachineType `
        --boot-disk-size=$BootDiskSize `
        --boot-disk-type=pd-ssd `
        --image-family=ubuntu-2204-lts `
        --image-project=ubuntu-os-cloud `
        --metadata=startup-script="$startupScript"
    
    Write-Info "Waiting for VM instance to be ready..."
    Start-Sleep -Seconds 30
}

# Get VM external IP
function Get-VmIp {
    $vmIp = gcloud compute instances describe $InstanceName --zone=$Zone --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
    Write-Info "VM External IP: $vmIp"
    Write-Warning "Please update your domain DNS to point to: $vmIp"
    Write-Warning "Add these DNS records in your Squarespace domain settings:"
    Write-Host "  A record: @ -> $vmIp" -ForegroundColor Cyan
    Write-Host "  A record: www -> $vmIp" -ForegroundColor Cyan
    return $vmIp
}

# Main deployment process
function Start-Deployment {
    Write-Info "🚀 Starting GCP deployment for unisight.dev..."
    
    Test-GCloud
    Set-GcpProject
    New-FirewallRules
    New-VmInstance
    $vmIp = Get-VmIp
    
    Write-Info "VM is ready! Next steps:"
    Write-Host "1. Update your DNS settings to point to $vmIp" -ForegroundColor Yellow
    Write-Host '2. Wait for DNS propagation (5-30 minutes)' -ForegroundColor Yellow
    Write-Host "3. SSH into the VM and complete the deployment" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To SSH into your VM:" -ForegroundColor Cyan
    Write-Host "gcloud compute ssh $InstanceName --zone=$Zone" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After SSH, run these commands on the VM:" -ForegroundColor Cyan
    Write-Host "sudo mkdir -p /opt/unisight && sudo chown ubuntu:ubuntu /opt/unisight" -ForegroundColor Cyan
    Write-Host "cd /opt/unisight" -ForegroundColor Cyan
    Write-Host "git clone https://github.com/your-username/it-tms.git ." -ForegroundColor Cyan
    Write-Host "cp env.gcp .env" -ForegroundColor Cyan
    Write-Host "nano .env  # Update with secure passwords" -ForegroundColor Cyan
    Write-Host "docker-compose -f docker-compose.gcp.yml up -d" -ForegroundColor Cyan
}

# Run the deployment
Start-Deployment
