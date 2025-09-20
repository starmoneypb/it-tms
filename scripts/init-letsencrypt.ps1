# Initialize Let's Encrypt certificates for unisight.dev (Windows PowerShell)
# This script provides the commands to run on your Linux VM

param(
    [string[]]$Domains = @("unisight.dev", "www.unisight.dev"),
    [int]$RsaKeySize = 4096,
    [string]$DataPath = "./certbot",
    [string]$Email = "admin@unisight.dev",
    [int]$Staging = 0  # Set to 1 for testing
)

function Write-Info { 
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow 
}

function Write-Commands {
    Write-Host @"

🔒 SSL Certificate Setup Commands for Linux VM
===============================================

Copy and paste these commands on your Linux VM after SSH:

# 1. Prepare directories
sudo rm -rf $DataPath
sudo mkdir -p $DataPath/www
sudo mkdir -p $DataPath/conf

# 2. Download TLS parameters
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > $DataPath/conf/options-ssl-nginx.conf
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > $DataPath/conf/ssl-dhparams.pem

# 3. Create dummy certificate
mkdir -p $DataPath/conf/live/unisight.dev
docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:$RsaKeySize -days 1 -keyout '/etc/letsencrypt/live/unisight.dev/privkey.pem' -out '/etc/letsencrypt/live/unisight.dev/fullchain.pem' -subj '/CN=localhost'" certbot

# 4. Start nginx
docker-compose -f docker-compose.gcp.yml up --force-recreate -d nginx

# 5. Delete dummy certificate
docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "rm -rf /etc/letsencrypt/live/unisight.dev && rm -rf /etc/letsencrypt/archive/unisight.dev && rm -rf /etc/letsencrypt/renewal/unisight.dev.conf" certbot

# 6. Request real certificate
docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot --email $Email -d unisight.dev -d www.unisight.dev --rsa-key-size $RsaKeySize --agree-tos --force-renewal" certbot

# 7. Reload nginx
docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload

# 8. Verify HTTPS
curl -I https://unisight.dev/healthz

===============================================
🎉 Your SSL certificates should now be active!
"@ -ForegroundColor Cyan
}

Write-Info "Generating SSL setup commands for unisight.dev..."
Write-Commands

Write-Warning "Remember to:"
Write-Host "1. SSH into your VM: gcloud compute ssh unisight-dev-vm --zone=asia-southeast1-b" -ForegroundColor Yellow
Write-Host "2. Navigate to your project: cd /opt/unisight" -ForegroundColor Yellow  
Write-Host "3. Run the commands above" -ForegroundColor Yellow
Write-Host "4. Update email in the commands if needed: $Email" -ForegroundColor Yellow

