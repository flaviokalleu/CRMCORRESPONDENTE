# Skill: OWASP Top 10 Compliance

## Purpose
Prevent the most common and critical web application security vulnerabilities.

## Rules

### A01: Broken Access Control
- Deny access by default — require explicit grants
- Enforce object-level authorization (user can only access their own data)
- Disable directory listing on web servers
- Invalidate sessions on logout and password change
- Rate-limit API access to prevent abuse

### A02: Cryptographic Failures
- Use TLS 1.2+ for all data in transit
- Hash passwords with bcrypt/argon2, never MD5/SHA1
- Encrypt sensitive data at rest (PII, financial data)
- Don't roll your own crypto — use established libraries
- Generate random tokens with `crypto.randomBytes`, not `Math.random`

### A03: Injection
- Use parameterized queries for all database operations
- Validate and sanitize all user inputs
- Use ORM methods instead of raw SQL wherever possible
- Escape special characters in dynamic queries
- Apply Content-Security-Policy headers

### A04: Insecure Design
- Implement threat modeling for new features
- Use rate limiting and resource quotas
- Validate business logic on the server, not just the client
- Design with fail-safe defaults — if a check fails, deny access

### A05: Security Misconfiguration
- Remove default credentials and sample applications
- Disable unnecessary HTTP methods (TRACE, OPTIONS in production)
- Set security headers: X-Content-Type-Options, X-Frame-Options, HSTS
- Keep error messages generic for end users — detailed logs server-side only
- Review CORS configuration — never use `origin: '*'` in production

### A06: Vulnerable Components
- Run `npm audit` regularly and fix critical/high vulnerabilities
- Pin dependency versions in production
- Monitor dependencies for known CVEs
- Remove unused dependencies
- Use lockfiles (`package-lock.json`) and verify integrity

### A07: Authentication Failures
- Implement multi-factor authentication for admin accounts
- Use strong password policies
- Protect against credential stuffing with rate limiting and CAPTCHA
- Don't expose whether an account exists in error messages

### A08: Data Integrity Failures
- Verify integrity of third-party code (SRI hashes for CDN scripts)
- Validate data at every trust boundary
- Use signed tokens (JWT) for session management
- Implement CI/CD pipeline security (signed commits, protected branches)

### A09: Logging & Monitoring Failures
- Log all authentication attempts (success and failure)
- Log authorization failures and input validation failures
- Never log sensitive data (passwords, tokens, credit cards)
- Set up alerting for suspicious patterns
- Retain logs long enough for forensic analysis

### A10: Server-Side Request Forgery (SSRF)
- Validate and sanitize all URLs before making server-side requests
- Use allowlists for permitted external domains
- Block requests to internal/private IP ranges
- Don't return raw responses from upstream services to the client
