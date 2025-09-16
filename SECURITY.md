# Security Configuration for IT-TMS

## Security Headers
The application should include the following security headers:

### API (Go/Fiber)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Content-Security-Policy: default-src 'self'

### Web (Next.js)
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## Environment Variables Security
- Never commit .env files
- Use strong JWT secrets (minimum 32 characters)
- Rotate secrets regularly
- Use different secrets for different environments

## Database Security
- Use parameterized queries (already implemented with sqlc)
- Enable SSL/TLS connections in production
- Use connection pooling
- Regular security updates

## Dependencies
- Regular security audits (npm audit, go mod audit)
- Keep dependencies updated
- Use Dependabot for automated updates

## Authentication & Authorization
- JWT tokens with reasonable expiration
- Secure password hashing (bcrypt)
- Rate limiting on authentication endpoints
- CORS configuration

## File Upload Security
- Validate file types and sizes
- Scan uploaded files for malware
- Store uploads outside web root
- Use secure file names

## Logging & Monitoring
- Log security events
- Monitor for suspicious activities
- Set up alerts for failed login attempts
- Regular log rotation
