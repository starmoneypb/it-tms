# IT-TMS Deployment Fixes and Improvements

## Overview
This document outlines the comprehensive fixes applied to resolve SSL certificate deployment and API connectivity issues encountered during production deployment.

## 🔧 Issues Fixed

### 1. Inconsistent API URL Configuration
**Problem:** Different React components had inconsistent logic for determining the API base URL, causing some to try connecting to `localhost:8080` instead of the production domain.

**Files Fixed:**
- `apps/web/components/Navigation.tsx`
- `apps/web/components/UserSearchSelect.tsx`
- `apps/web/app/[locale]/admin/classify/page.tsx`
- `apps/web/app/[locale]/tickets/new/page.tsx`
- `apps/web/app/[locale]/tickets/[id]/page.tsx`
- `apps/web/app/[locale]/profile/page.tsx`
- `apps/web/app/[locale]/tickets/page.tsx`
- `apps/web/app/[locale]/(auth)/sign-in/page.tsx`

**Solution:** Standardized all components to use the same API URL logic:
```typescript
const API = typeof window !== 'undefined' && window.location.port === '8000'
  ? '' // Use relative URLs when accessed through port 8000 (production-like)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");
```

### 2. Docker Compose Port Mapping Issues
**Problem:** nginx was mapped to ports 8080/8443 instead of standard 80/443, preventing Let's Encrypt from validating the domain.

**File Fixed:** `docker-compose.gcp.yml`

**Changes:**
- Changed port mapping from `"8080:80"` to `"80:80"`
- Changed port mapping from `"8443:443"` to `"443:443"`
- Fixed `NEXT_PUBLIC_API_URL` from `https://unisight.dev/api` to `https://unisight.dev`

### 3. Nginx SSL Configuration Issues
**Problem:** 
- Deprecated `http2` directive causing warnings
- API proxy routing not preserving `/api` path correctly

**File Fixed:** `nginx/nginx-ssl.conf`

**Changes:**
- Updated `listen 443 ssl http2;` to `listen 443 ssl;` with separate `http2 on;`
- Fixed API routing from `proxy_pass http://api;` to `proxy_pass http://api/api/;`

### 4. SSL Certificate Setup Process
**Problem:** The original SSL setup script had multiple issues:
- Assumed bind mounts instead of Docker named volumes
- Didn't handle the `-0001` certificate suffix issue
- Missing required certificate files (`chain.pem`)
- Incorrect permission handling

**File Fixed:** `scripts/init-letsencrypt.ps1`

**Improvements:**
- Uses Docker named volumes correctly
- Creates all required certificate files (fullchain.pem, privkey.pem, chain.pem)
- Handles the `-0001` certificate suffix with automatic symlinks
- Proper sudo usage throughout
- Better error handling and explanations

## 🚀 New Features

### 1. Production Deployment Script
**New File:** `scripts/deploy-production.sh`

**Features:**
- Complete automated deployment process
- Comprehensive error handling and logging
- Automatic backup creation before deployment
- Health checks for all services
- Graceful service restart with proper wait times
- Docker cleanup to prevent disk space issues
- Colored output for better readability

### 2. Enhanced Documentation
**File Updated:** `GCP-DEPLOYMENT-GUIDE.md`

**Improvements:**
- Updated SSL setup instructions with correct process
- Added comprehensive troubleshooting section for common issues
- Added API connectivity troubleshooting
- Documented the certificate suffix issue and solution
- Updated all commands to reflect the fixes

## 📋 Deployment Process

### Before These Fixes
1. SSL setup often failed with "connection refused" errors
2. Manual intervention required for certificate suffix issues
3. API calls failed due to port/URL mismatches
4. nginx health checks failed due to incorrect configuration

### After These Fixes
1. SSL setup works reliably with the corrected script
2. Automatic handling of certificate suffix issues
3. Consistent API connectivity across all environments
4. Proper nginx configuration with health checks

## 🔍 Technical Details

### Environment Variable Handling
- Fixed `NEXT_PUBLIC_API_URL` to use base domain without `/api` suffix
- Ensured Next.js rebuild picks up environment changes
- Consistent fallback logic across all components

### Docker Volume Management
- Switched from bind mounts to named volumes for SSL certificates
- Proper handling of Docker volume permissions
- Correct TLS parameter file placement

### nginx Configuration
- Modern HTTP/2 configuration syntax
- Correct API proxy routing with path preservation
- Proper SSL certificate file references

### Certificate Management
- Automatic symlink creation for certificate path consistency
- Support for Let's Encrypt's `-0001` suffix pattern
- All required certificate files (fullchain, privkey, chain)

## 🧪 Testing Recommendations

After applying these fixes:

1. **SSL Certificate Test:**
   ```bash
   curl -I https://unisight.dev/healthz
   # Should return 200 OK with proper SSL
   ```

2. **API Connectivity Test:**
   ```bash
   curl -I https://unisight.dev/api/v1/me
   # Should return 401 Unauthorized (not 404 or 502)
   ```

3. **Web Application Test:**
   - Visit https://unisight.dev
   - Check browser console for no CSP violations
   - Verify login functionality works
   - Test ticket creation and file uploads

## 🔄 Future Maintenance

### SSL Certificate Renewal
Certificates will auto-renew via the certbot container. Manual renewal:
```bash
sudo docker-compose -f docker-compose.gcp.yml run --rm certbot renew
sudo docker-compose -f docker-compose.gcp.yml exec nginx nginx -s reload
```

### Deployment Updates
Use the new deployment script:
```bash
sudo ./scripts/deploy-production.sh
```

### Monitoring
- Check logs: `docker-compose -f docker-compose.gcp.yml logs -f`
- Monitor disk space: `df -h`
- Check certificate expiry: `openssl s_client -connect unisight.dev:443 -servername unisight.dev | openssl x509 -noout -dates`

## 📝 Commit Message Suggestions

When committing these changes:

```
feat: comprehensive deployment fixes and improvements

- Fix inconsistent API URL logic across React components
- Update docker-compose port mappings for standard SSL ports
- Fix nginx SSL configuration and API routing
- Improve SSL certificate setup script with proper Docker volumes
- Add automated production deployment script
- Update documentation with troubleshooting guides

Resolves SSL certificate deployment issues and API connectivity problems.
```

## 🎯 Summary

These fixes address all the major deployment issues encountered:
- ✅ SSL certificates now deploy reliably
- ✅ API connectivity works consistently 
- ✅ nginx configuration is modernized and correct
- ✅ Deployment process is automated and robust
- ✅ Documentation is comprehensive and up-to-date

The application should now deploy smoothly and operate reliably in production.
