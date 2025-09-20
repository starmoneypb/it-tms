#!/bin/bash

# GCP Deployment Script for unisight.dev
# This script automates the deployment process on Google Cloud Platform

set -e

echo "🚀 Starting GCP deployment for unisight.dev..."

# Configuration
PROJECT_ID="unisight-472720"
REGION="asia-southeast1"
ZONE="asia-southeast1-b"
INSTANCE_NAME="unisight-dev-vm"
MACHINE_TYPE="e2-standard-2"
BOOT_DISK_SIZE="30GB"
DOMAIN="unisight.dev"

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

# Set the GCP project
set_project() {
    echo_info "Setting GCP project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
    
    # Enable required APIs
    echo_info "Enabling required GCP APIs..."
    gcloud services enable compute.googleapis.com
    gcloud services enable dns.googleapis.com
    gcloud services enable logging.googleapis.com
    gcloud services enable monitoring.googleapis.com
}

# Create firewall rules
create_firewall_rules() {
    echo_info "Creating firewall rules..."
    
    # Allow HTTP traffic
    if ! gcloud compute firewall-rules describe allow-http &> /dev/null; then
        gcloud compute firewall-rules create allow-http \
            --allow tcp:80 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow HTTP traffic"
    fi
    
    # Allow HTTPS traffic
    if ! gcloud compute firewall-rules describe allow-https &> /dev/null; then
        gcloud compute firewall-rules create allow-https \
            --allow tcp:443 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow HTTPS traffic"
    fi
    
    # Allow SSH
    if ! gcloud compute firewall-rules describe allow-ssh &> /dev/null; then
        gcloud compute firewall-rules create allow-ssh \
            --allow tcp:22 \
            --source-ranges 0.0.0.0/0 \
            --description "Allow SSH access"
    fi
}

# Create VM instance
create_vm_instance() {
    echo_info "Creating VM instance: $INSTANCE_NAME..."
    
    if gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE &> /dev/null; then
        echo_warning "Instance $INSTANCE_NAME already exists. Skipping creation."
        return
    fi
    
    gcloud compute instances create $INSTANCE_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --boot-disk-size=$BOOT_DISK_SIZE \
        --boot-disk-type=pd-ssd \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --tags=http-server,https-server \
        --metadata=startup-script='#!/bin/bash
            # Update system
            apt-get update
            apt-get upgrade -y
            
            # Install Docker
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            usermod -aG docker $USER
            
            # Install Docker Compose
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            
            # Install Git
            apt-get install -y git curl wget unzip
            
            # Create app directory
            mkdir -p /opt/unisight
            chown $USER:$USER /opt/unisight
            
            # Install Node.js (for local development if needed)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            
            # Install Go (for local development if needed)
            wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
            tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
            echo "export PATH=$PATH:/usr/local/go/bin" >> /etc/profile
            
            echo "VM setup completed" >> /var/log/startup.log
        '
    
    echo_info "Waiting for VM instance to be ready..."
    sleep 30
}

# Get VM external IP
get_vm_ip() {
    VM_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    echo_info "VM External IP: $VM_IP"
    echo_warning "Please update your domain DNS to point to: $VM_IP"
    echo_warning "Add these DNS records in your Squarespace domain settings:"
    echo "  A record: @ -> $VM_IP"
    echo "  A record: www -> $VM_IP"
}

# Deploy application to VM
deploy_application() {
    echo_info "Deploying application to VM..."
    
    # Create a temporary script for deployment
    cat > /tmp/deploy_script.sh << 'EOF'
#!/bin/bash
set -e

# Clone or update repository
if [ -d "/opt/unisight/.git" ]; then
    cd /opt/unisight
    git pull origin main
else
    git clone https://github.com/your-username/it-tms.git /opt/unisight
    cd /opt/unisight
fi

# Copy environment file
cp env.gcp .env

# Update environment variables with secure values
echo "Please update the .env file with secure passwords and secrets"

# Build and start services
docker-compose -f docker-compose.gcp.yml build
docker-compose -f docker-compose.gcp.yml up -d db api web

# Wait for services to be ready
sleep 30

# Initialize SSL certificates
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh

echo "Deployment completed successfully!"
EOF

    # Copy script to VM and execute
    gcloud compute scp /tmp/deploy_script.sh $INSTANCE_NAME:/tmp/deploy_script.sh --zone=$ZONE
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="chmod +x /tmp/deploy_script.sh && sudo /tmp/deploy_script.sh"
    
    # Clean up
    rm /tmp/deploy_script.sh
}

# Main deployment process
main() {
    echo_info "Starting deployment process..."
    
    check_gcloud
    set_project
    create_firewall_rules
    create_vm_instance
    get_vm_ip
    
    echo_info "VM is ready! Now you need to:"
    echo "1. Update your DNS settings to point to $VM_IP"
    echo "2. Wait for DNS propagation (5-30 minutes)"
    echo "3. SSH into the VM and complete the deployment"
    echo ""
    echo "To SSH into your VM:"
    echo "gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
    echo ""
    echo "Once on the VM, run the deployment:"
    echo "cd /opt/unisight && sudo ./scripts/init-letsencrypt.sh"
}

# Run main function
main "$@"

