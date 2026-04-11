# Skill: Infrastructure Management

## Purpose
Manage reliable, scalable, and cost-effective infrastructure for the application.

## Rules

### Environment Configuration
- Maintain separate configs for: development, staging, production
- Use environment variables for all environment-specific values
- Never share database credentials between environments
- Document all required environment variables with descriptions
- Validate all required env vars at application startup — fail fast if missing

### Database Operations
- Automated daily backups with 30-day retention
- Test backup restoration monthly
- Run migrations in a transaction when possible
- Always back up before destructive migrations (column drops, table deletes)
- Monitor database size and connection pool usage

### SSL/TLS
- HTTPS everywhere — redirect HTTP to HTTPS
- Auto-renew certificates (Let's Encrypt / Certbot)
- TLS 1.2 minimum, prefer 1.3
- HSTS header with at least 1 year max-age
- Pin certificates for mobile apps connecting to the API

### Scaling Patterns
- Horizontal scaling: stateless backend behind a load balancer
- Sticky sessions if using WebSocket (Socket.io) — or use Redis adapter
- Database connection pooling with appropriate limits
- Rate limiting at the reverse proxy level (Nginx/Cloudflare)
- CDN for static assets (frontend build, uploaded images)

### Disaster Recovery
- Define RPO (Recovery Point Objective) and RTO (Recovery Time Objective)
- Automated failover for critical services
- Runbook for common failure scenarios
- Regular disaster recovery drills
- Offsite backup storage in a different region

### Security Hardening
- Firewall: allow only necessary ports (80, 443, SSH)
- SSH: key-based auth only, disable root login
- Automatic OS security updates
- Fail2ban for brute-force protection
- Regular vulnerability scans of the infrastructure
