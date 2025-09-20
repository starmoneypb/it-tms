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

# 1. Download TLS parameters (Docker volumes are used, no local directories needed)
sudo curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -o /tmp/options-ssl-nginx.conf
sudo curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem -o /tmp/ssl-dhparams.pem

# 2. Copy TLS parameters to Docker volumes
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "sh -c 'mkdir -p /etc/letsencrypt && cp /tmp/options-ssl-nginx.conf /etc/letsencrypt/ && cp /tmp/ssl-dhparams.pem /etc/letsencrypt/'" -v /tmp:/tmp certbot

# 3. Create dummy certificate directory and files
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "mkdir -p /etc/letsencrypt/live/unisight.dev" certbot
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:$RsaKeySize -days 1 -keyout '/etc/letsencrypt/live/unisight.dev/privkey.pem' -out '/etc/letsencrypt/live/unisight.dev/fullchain.pem' -subj '/CN=localhost'" certbot
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "cp /etc/letsencrypt/live/unisight.dev/fullchain.pem /etc/letsencrypt/live/unisight.dev/chain.pem" certbot

# 4. Start nginx with dummy certificates
sudo docker-compose -f docker-compose.gcp.yml up --force-recreate -d nginx

# 5. Delete dummy certificate
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "rm -rf /etc/letsencrypt/live/unisight.dev && rm -rf /etc/letsencrypt/archive/unisight.dev && rm -rf /etc/letsencrypt/renewal/unisight.dev.conf" certbot

# 6. Request real certificate
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot --email $Email -d unisight.dev -d www.unisight.dev --rsa-key-size $RsaKeySize --agree-tos --force-renewal" certbot

# 7. Create symlinks for nginx to find certificates (handles -0001 suffix)
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "mkdir -p /etc/letsencrypt/live/unisight.dev" certbot
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/fullchain.pem /etc/letsencrypt/live/unisight.dev/fullchain.pem" certbot
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/privkey.pem /etc/letsencrypt/live/unisight.dev/privkey.pem" certbot
sudo docker-compose -f docker-compose.gcp.yml run --rm --entrypoint "ln -sf /etc/letsencrypt/live/unisight.dev-0001/fullchain.pem /etc/letsencrypt/live/unisight.dev/chain.pem" certbot

# 8. Reload nginx with real certificates
sudo docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload

# 9. Verify HTTPS
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

