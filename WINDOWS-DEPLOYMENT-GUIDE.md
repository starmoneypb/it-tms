# Windows Deployment Guide for unisight.dev

This guide provides step-by-step instructions for deploying your IT-TMS application on Google Cloud Platform from a Windows machine.

## 🚀 Quick Setup for Windows Users

### Prerequisites

1. **Install Google Cloud CLI:**
   - Download from: https://cloud.google.com/sdk/docs/install-windows
   - Run the installer and follow the setup wizard
   - Open a new PowerShell window after installation

2. **Authenticate with Google Cloud:**
   ```powershell
   gcloud auth login
   gcloud config set project unisight-472720
   ```

3. **Enable billing** in your GCP project (required for VM creation)

## 📋 Step-by-Step Deployment

### Step 1: Deploy Infrastructure

1. **Open PowerShell as Administrator** in your project directory:
   ```powershell
   cd C:\Users\User\Projects\it-tms
   ```

2. **Run the deployment script:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\scripts\deploy-gcp.ps1
   ```

3. **Note the VM IP address** that gets displayed (e.g., `34.123.45.67`)

### Step 2: Configure DNS in Squarespace

1. **Log into Squarespace:**
   - Go to Settings → Domains → unisight.dev → DNS Settings

2. **Add these DNS records:**
   - **A Record:** `@` → `YOUR_VM_IP_ADDRESS` (TTL: 300 seconds)
   - **A Record:** `www` → `YOUR_VM_IP_ADDRESS` (TTL: 300 seconds)

3. **Wait for DNS propagation (5-30 minutes):**
   ```powershell
   # Test DNS resolution
   nslookup unisight.dev
   ```

### Step 3: Deploy Application to VM

1. **SSH into your VM:**
   ```powershell
   gcloud compute ssh unisight-dev-vm --zone=asia-southeast1-b
   ```

2. **Set up the application** (run these commands on the Linux VM):
   ```bash
   # Create and navigate to app directory
   sudo mkdir -p /opt/unisight
   sudo chown ubuntu:ubuntu /opt/unisight
   cd /opt/unisight
   
   # Clone your repository (you'll need to upload your code or use git)
   # Option 1: If you have a git repository
   git clone https://github.com/your-username/it-tms.git .
   
   # Option 2: If you need to upload files manually, exit SSH and use:
   # gcloud compute scp --recurse C:\Users\User\Projects\it-tms unisight-dev-vm:/opt/unisight --zone=asia-southeast1-b
   ```

3. **Configure environment variables:**
   ```bash
   # Copy the production environment file
   cp env.gcp .env
   
   # Edit with your secure values
   nano .env
   ```

   **Important:** Update these values in `.env`:
   ```env
   POSTGRES_PASSWORD=postgresunisightdev  # Use a more secure password
   JWT_SECRET=your_extremely_long_and_random_jwt_secret_key_for_production_use_at_least_64_characters_long_with_special_chars_123!@#$%
   ```

4. **Start the application:**
   ```bash
   # Build and start services
   docker-compose -f docker-compose.gcp.yml up -d db api web
   
   # Wait for services to start
   sleep 30
   
   # Check if services are running
   docker-compose -f docker-compose.gcp.yml ps
   
   # Test HTTP access
   curl http://localhost/healthz
   ```

### Step 4: Set Up SSL Certificates

1. **From your Windows machine, generate SSL commands:**
   ```powershell
   .\scripts\init-letsencrypt.ps1
   ```

2. **Copy the generated commands** and run them on your Linux VM (while SSH'd in):
   ```bash
   # The script will output commands like these - copy and paste them:
   
   # Prepare directories
   sudo rm -rf ./certbot
   sudo mkdir -p ./certbot/www
   sudo mkdir -p ./certbot/conf
   
   # Download TLS parameters
   curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > ./certbot/conf/options-ssl-nginx.conf
   curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > ./certbot/conf/ssl-dhparams.pem
   
   # Create dummy certificate
   mkdir -p ./certbot/conf/live/unisight.dev
   docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout '/etc/letsencrypt/live/unisight.dev/privkey.pem' -out '/etc/letsencrypt/live/unisight.dev/fullchain.pem' -subj '/CN=localhost'" certbot
   
   # Start nginx
   docker-compose -f docker-compose.gcp.yml up --force-recreate -d nginx
   
   # Delete dummy certificate
   docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "rm -rf /etc/letsencrypt/live/unisight.dev && rm -rf /etc/letsencrypt/archive/unisight.dev && rm -rf /etc/letsencrypt/renewal/unisight.dev.conf" certbot
   
   # Request real certificate
   docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot --email admin@unisight.dev -d unisight.dev -d www.unisight.dev --rsa-key-size 4096 --agree-tos --force-renewal" certbot
   
   # Reload nginx
   docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload
   ```

3. **Verify HTTPS is working:**
   ```bash
   curl -I https://unisight.dev/healthz
   ```

## 🔍 Verification Steps

### From Windows PowerShell:
```powershell
# Test your website
Invoke-WebRequest -Uri "https://unisight.dev/healthz" -UseBasicParsing

# Check SSL certificate
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=unisight.dev
```

### Test the application:
1. Open browser to: https://unisight.dev
2. Sign in with demo credentials
3. Create a test ticket
4. Upload a file to test functionality

## 🛠 Management Commands (Windows)

### View VM Status:
```powershell
gcloud compute instances list --filter="name:unisight-dev-vm"
```

### SSH into VM:
```powershell
gcloud compute ssh unisight-dev-vm --zone=asia-southeast1-b
```

### Copy files to/from VM:
```powershell
# Upload files to VM
gcloud compute scp --recurse "C:\local\path" unisight-dev-vm:/opt/unisight --zone=asia-southeast1-b

# Download files from VM
gcloud compute scp --recurse unisight-dev-vm:/opt/unisight/backups "C:\local\backups" --zone=asia-southeast1-b
```

### View VM logs:
```powershell
gcloud compute instances get-serial-port-output unisight-dev-vm --zone=asia-southeast1-b
```

## 🚨 Troubleshooting

### Common Windows Issues:

#### PowerShell Execution Policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### gcloud not recognized:
- Restart PowerShell after installing gcloud CLI
- Add gcloud to PATH manually if needed

#### SSH connection issues:
```powershell
# Generate SSH keys if needed
gcloud compute config-ssh

# Try alternative SSH method
gcloud compute ssh unisight-dev-vm --zone=asia-southeast1-b --ssh-flag="-v"
```

### Application Issues (run on Linux VM):

#### Check services:
```bash
docker-compose -f docker-compose.gcp.yml ps
docker-compose -f docker-compose.gcp.yml logs
```

#### Restart services:
```bash
docker-compose -f docker-compose.gcp.yml restart
```

#### Check disk space:
```bash
df -h
docker system df
```

## 📊 Monitoring from Windows

### Check VM metrics:
```powershell
gcloud compute instances describe unisight-dev-vm --zone=asia-southeast1-b --format="table(status,machineType.basename(),disks[0].diskSizeGb,networkInterfaces[0].accessConfigs[0].natIP)"
```

### View logs:
```powershell
gcloud logging read "resource.type=gce_instance AND resource.labels.instance_id=unisight-dev-vm" --limit=50 --format="table(timestamp,severity,textPayload)"
```

## 🔄 Backup Strategy

### Create backup script on VM:
```bash
# SSH into VM first, then create this script
cat > /opt/unisight/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/backups
docker exec $(docker ps -qf "name=db") pg_dump -U postgres it_tms > /opt/backups/db_backup_$DATE.sql
tar -czf /opt/backups/uploads_backup_$DATE.tar.gz -C /opt/unisight uploads/
find /opt/backups -name "*.sql" -mtime +7 -delete
find /opt/backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/unisight/backup.sh

# Add to cron for daily backups
echo "0 2 * * * /opt/unisight/backup.sh" | crontab -
```

### Download backups to Windows:
```powershell
gcloud compute scp --recurse unisight-dev-vm:/opt/backups "C:\Users\User\Backups\unisight" --zone=asia-southeast1-b
```

## 🎉 Success Checklist

Your deployment is successful when:

- [ ] VM is created and running in GCP
- [ ] DNS records point to VM IP address
- [ ] https://unisight.dev loads without errors
- [ ] SSL certificate is valid (green lock icon)
- [ ] You can sign in with demo credentials
- [ ] You can create and manage tickets
- [ ] File uploads work correctly
- [ ] All health checks pass: `https://unisight.dev/healthz`

## 📞 Windows-Specific Support

### Useful PowerShell commands:
```powershell
# Check gcloud version
gcloud version

# List all projects
gcloud projects list

# Switch projects
gcloud config set project unisight-472720

# List compute instances
gcloud compute instances list

# Stop VM (to save costs)
gcloud compute instances stop unisight-dev-vm --zone=asia-southeast1-b

# Start VM
gcloud compute instances start unisight-dev-vm --zone=asia-southeast1-b

# Delete VM (if needed)
gcloud compute instances delete unisight-dev-vm --zone=asia-southeast1-b
```

Your IT-TMS application should now be successfully deployed and accessible at **https://unisight.dev** from your Windows machine! 🚀

