# GCP Deployment Guide for unisight.dev

This comprehensive guide will walk you through deploying your IT-TMS application on Google Cloud Platform with the domain **unisight.dev**.

## 🚀 Quick Start Checklist

- [ ] GCP account with billing enabled
- [ ] Domain unisight.dev purchased from Squarespace
- [ ] gcloud CLI installed and authenticated
- [ ] Git repository accessible (public or with SSH keys)

## 📋 Prerequisites

### 1. Google Cloud Platform Setup

1. **Create/Select GCP Project:**
   ```bash
   # Create new project
   gcloud projects create unisight-dev-project --name="Unisight Dev"
   
   # Or select existing project
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Billing:**
   - Go to [GCP Console](https://console.cloud.google.com)
   - Navigate to Billing
   - Link a billing account to your project

3. **Install gcloud CLI:**
   ```bash
   # Download from: https://cloud.google.com/sdk/docs/install
   # After installation:
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

### 2. Domain Configuration (Squarespace)

1. **Access DNS Settings:**
   - Log into your Squarespace account
   - Go to Settings → Domains → unisight.dev → DNS Settings

2. **Prepare for DNS Update:**
   - You'll need the VM IP address (obtained during deployment)
   - Keep this tab open for later configuration

## 🔧 Deployment Process

### Step 1: Update Configuration Files

1. **Update GCP Project ID:**
   ```bash
   # Edit scripts/deploy-gcp.sh
   sed -i 's/your-gcp-project-id/YOUR_ACTUAL_PROJECT_ID/g' scripts/deploy-gcp.sh
   ```

2. **Update Environment Variables:**
   ```bash
   # Copy and edit the production environment file
   cp env.gcp .env
   
   # Generate secure passwords and secrets
   # IMPORTANT: Change these values!
   nano .env
   ```

   **Required changes in .env:**
   ```env
   # Generate a strong database password (32+ characters)
   POSTGRES_PASSWORD=your_super_secure_database_password_here_32_chars_min
   
   # Generate a strong JWT secret (64+ characters)
   JWT_SECRET=your_extremely_long_jwt_secret_minimum_64_characters_with_special_chars_123!@#
   ```

### Step 2: Deploy to GCP

1. **Run the deployment script:**
   ```bash
   chmod +x scripts/deploy-gcp.sh
   ./scripts/deploy-gcp.sh
   ```

2. **The script will:**
   - Create firewall rules (HTTP/HTTPS/SSH)
   - Create a VM instance with Docker pre-installed
   - Display the external IP address

3. **Note the VM IP address** displayed at the end (e.g., `34.123.45.67`)

### Step 3: Configure DNS (Squarespace)

1. **Add DNS Records:**
   - **A Record:** `@` → `VM_IP_ADDRESS` (TTL: 300)
   - **A Record:** `www` → `VM_IP_ADDRESS` (TTL: 300)

2. **Wait for DNS Propagation (5-30 minutes):**
   ```bash
   # Check DNS propagation
   nslookup unisight.dev
   dig unisight.dev
   ```

### Step 4: Complete Application Deployment

1. **SSH into your VM:**
   ```bash
   gcloud compute ssh unisight-dev-vm --zone=us-central1-a
   ```

2. **Clone your repository:**
   ```bash
   sudo mkdir -p /opt/unisight
   sudo chown $USER:$USER /opt/unisight
   cd /opt/unisight
   
   # Clone your repository (replace with your actual repo URL)
   git clone https://github.com/your-username/it-tms.git .
   ```

3. **Configure environment:**
   ```bash
   # Copy and edit environment file
   cp env.gcp .env
   
   # Edit with secure values
   sudo nano .env
   ```

4. **Start the application:**
   ```bash
   # Build and start services (without SSL first)
   docker-compose -f docker-compose.gcp.yml up -d db api web
   
   # Wait for services to be ready
   sleep 30
   
   # Check if services are running
   docker-compose -f docker-compose.gcp.yml ps
   ```

5. **Test HTTP access:**
   ```bash
   # Test locally on VM
   curl http://localhost/healthz
   
   # Test externally (from your local machine)
   curl http://unisight.dev/healthz
   ```

### Step 5: Initialize SSL Certificates

1. **Generate SSL setup commands (run locally on Windows):**
   ```powershell
   # From project root on your Windows machine
   .\scripts\init-letsencrypt.ps1
   ```

2. **Execute the generated commands on your Linux VM:**
   The PowerShell script will output commands to run on your VM. SSH into your VM and execute them:
   ```bash
   # SSH into your VM
   gcloud compute ssh unisight-dev-vm --zone=asia-southeast1-b
   
   # Navigate to project directory
   cd /opt/unisight
   
   # Run the commands output by the PowerShell script
   # (The script handles Docker volumes, dummy certificates, and real certificate generation)
   ```

3. **Key points about the SSL setup:**
   - Uses Docker named volumes instead of bind mounts
   - Creates dummy certificates first to allow nginx to start
   - Handles the `-0001` certificate suffix issue automatically
   - Ensures nginx uses standard ports 80/443 for Let's Encrypt validation

3. **Verify HTTPS:**
   ```bash
   # Test HTTPS locally
   curl https://localhost/healthz
   
   # Test HTTPS externally
   curl https://unisight.dev/healthz
   ```

## 🔍 Verification Steps

### 1. Health Checks
```bash
# API Health
curl https://unisight.dev/healthz

# Web Application
curl -I https://unisight.dev/

# Database connectivity (from VM)
docker exec -it unisight_db_1 psql -U postgres -d it_tms -c "SELECT 1;"
```

### 2. SSL Certificate Verification
```bash
# Check certificate details
openssl s_client -connect unisight.dev:443 -servername unisight.dev

# Online SSL checker
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=unisight.dev
```

### 3. Application Testing
1. **Visit:** https://unisight.dev
2. **Test Sign-in:** Use demo credentials
3. **Create Test Ticket:** Verify full functionality
4. **File Upload:** Test attachment functionality

## 🛠 Management Commands

### Application Management
```bash
# SSH into VM
gcloud compute ssh unisight-dev-vm --zone=us-central1-a

# View logs
docker-compose -f docker-compose.gcp.yml logs -f

# Restart services
docker-compose -f docker-compose.gcp.yml restart

# Update application
git pull origin main
docker-compose -f docker-compose.gcp.yml build
docker-compose -f docker-compose.gcp.yml up -d
```

### SSL Certificate Renewal
```bash
# Certificates auto-renew, but to manually renew:
docker-compose -f docker-compose.gcp.yml run --rm certbot renew
docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload
```

### Database Management
```bash
# Connect to database
docker exec -it unisight_db_1 psql -U postgres -d it_tms

# Backup database
docker exec unisight_db_1 pg_dump -U postgres it_tms > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker exec -i unisight_db_1 psql -U postgres it_tms < backup_file.sql
```

## 🔒 Security Best Practices

### 1. Environment Variables
- [ ] Changed all default passwords
- [ ] Used strong JWT secret (64+ characters)
- [ ] Set SECURE_COOKIES=true
- [ ] Configured proper CORS origins

### 2. Firewall Configuration
```bash
# View current firewall rules
gcloud compute firewall-rules list

# The deployment creates these rules:
# - allow-http (port 80)
# - allow-https (port 443)
# - allow-ssh (port 22)
```

### 3. VM Security
```bash
# Update system packages regularly
sudo apt update && sudo apt upgrade -y

# Monitor system logs
sudo journalctl -f

# Check Docker security
docker system prune -f
```

## 📊 Monitoring & Logs

### Application Logs
```bash
# View all logs
docker-compose -f docker-compose.gcp.yml logs

# View specific service logs
docker-compose -f docker-compose.gcp.yml logs api
docker-compose -f docker-compose.gcp.yml logs web
docker-compose -f docker-compose.gcp.yml logs nginx

# Follow logs in real-time
docker-compose -f docker-compose.gcp.yml logs -f
```

### System Monitoring
```bash
# Resource usage
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h

# Network connections
netstat -tulpn
```

## 🚨 Troubleshooting

### Common Issues

#### 1. DNS Not Resolving
```bash
# Check DNS propagation
nslookup unisight.dev 8.8.8.8
dig @8.8.8.8 unisight.dev

# If not resolving, wait more time or check DNS settings
```

#### 2. SSL Certificate Issues

**Common SSL Issues and Solutions:**

1. **"Connection refused" during certificate request:**
   ```bash
   # Check if nginx is running on correct ports
   sudo docker ps
   
   # Ensure ports 80/443 are mapped correctly
   grep -A 3 "ports:" docker-compose.gcp.yml
   
   # Should show:
   # - "80:80"
   # - "443:443"
   ```

2. **Nginx fails to start with SSL certificate errors:**
   ```bash
   # Check nginx logs
   sudo docker logs <nginx-container-id>
   
   # Create missing dummy certificates
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "mkdir -p /etc/letsencrypt/live/unisight.dev" certbot
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout '/etc/letsencrypt/live/unisight.dev/privkey.pem' -out '/etc/letsencrypt/live/unisight.dev/fullchain.pem' -subj '/CN=localhost'" certbot
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "cp /etc/letsencrypt/live/unisight.dev/fullchain.pem /etc/letsencrypt/live/unisight.dev/chain.pem" certbot
   ```

3. **Certificate saved with -0001 suffix:**
   ```bash
   # Create symlinks to expected paths
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "mkdir -p /etc/letsencrypt/live/unisight.dev" certbot
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/fullchain.pem /etc/letsencrypt/live/unisight.dev/fullchain.pem" certbot
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/privkey.pem /etc/letsencrypt/live/unisight.dev/privkey.pem" certbot
   sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/fullchain.pem /etc/letsencrypt/live/unisight.dev/chain.pem" certbot
   
   # Reload nginx
   sudo docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload
   ```

4. **General SSL troubleshooting:**
   ```bash
   # Check certificate status
   docker-compose -f docker-compose.gcp.yml logs certbot
   
   # Check nginx configuration
   docker-compose -f docker-compose.gcp.yml exec nginx nginx -t
   
   # Re-run SSL initialization
   # Use the PowerShell script to generate fresh commands
   ```

#### 3. API Connectivity Issues

**"CSP violation" or "localhost:8080" errors:**

1. **Check environment variables:**
   ```bash
   # Verify web container has correct API URL
   sudo docker-compose -f docker-compose.gcp.yml exec web printenv | grep NEXT_PUBLIC_API_URL
   
   # Should show: NEXT_PUBLIC_API_URL=https://unisight.dev
   ```

2. **Rebuild web container if needed:**
   ```bash
   # Next.js bakes environment variables at build time
   sudo docker-compose -f docker-compose.gcp.yml stop web
   sudo docker-compose -f docker-compose.gcp.yml build --no-cache web
   sudo docker-compose -f docker-compose.gcp.yml up -d web
   ```

3. **Check nginx API routing:**
   ```bash
   # Test API endpoint directly
   curl -I https://unisight.dev/api/v1/me
   
   # Should return 401 Unauthorized (not 404 or 502)
   ```

#### 4. Application Not Starting
```bash
# Check service health
docker-compose -f docker-compose.gcp.yml ps

# View detailed logs
docker-compose -f docker-compose.gcp.yml logs api
docker-compose -f docker-compose.gcp.yml logs web

# Restart services
docker-compose -f docker-compose.gcp.yml restart
```

#### 4. Database Connection Issues
```bash
# Check database health
docker exec unisight_db_1 pg_isready -U postgres

# Check database logs
docker logs unisight_db_1

# Restart database
docker-compose -f docker-compose.gcp.yml restart db
```

### Emergency Recovery
```bash
# If something goes wrong, you can rebuild everything:
docker-compose -f docker-compose.gcp.yml down -v
docker system prune -f
docker-compose -f docker-compose.gcp.yml up -d --build
```

## 📈 Scaling & Performance

### Resource Monitoring
```bash
# Check VM resources
gcloud compute instances describe unisight-dev-vm --zone=us-central1-a

# Upgrade VM if needed
gcloud compute instances stop unisight-dev-vm --zone=us-central1-a
gcloud compute instances set-machine-type unisight-dev-vm --machine-type=e2-standard-4 --zone=us-central1-a
gcloud compute instances start unisight-dev-vm --zone=us-central1-a
```

### Performance Optimization
```bash
# Enable Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Optimize database
docker exec unisight_db_1 psql -U postgres -d it_tms -c "VACUUM ANALYZE;"

# Monitor application performance
docker stats --no-stream
```

## 🔄 Backup Strategy

### Automated Backups
```bash
# Create backup script
cat > /opt/unisight/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec unisight_db_1 pg_dump -U postgres it_tms > /opt/backups/db_backup_$DATE.sql
docker exec unisight_uploads_1 tar -czf /opt/backups/uploads_backup_$DATE.tar.gz /app/uploads
find /opt/backups -name "*.sql" -mtime +7 -delete
find /opt/backups -name "*.tar.gz" -mtime +7 -delete
EOF

# Make executable and add to cron
chmod +x /opt/unisight/backup.sh
echo "0 2 * * * /opt/unisight/backup.sh" | crontab -
```

## 🎉 Success Verification

Your deployment is successful when:

- [ ] https://unisight.dev loads without errors
- [ ] SSL certificate is valid (green lock icon)
- [ ] You can sign in with demo credentials
- [ ] You can create and manage tickets
- [ ] File uploads work correctly
- [ ] API endpoints respond correctly
- [ ] All health checks pass

## 📞 Support

If you encounter issues:

1. **Check logs:** Follow the monitoring section
2. **Verify DNS:** Ensure proper DNS configuration
3. **Test connectivity:** Use curl commands provided
4. **Review configuration:** Double-check environment variables
5. **Restart services:** Often resolves temporary issues

Your IT-TMS application should now be successfully deployed and accessible at **https://unisight.dev**! 🚀

