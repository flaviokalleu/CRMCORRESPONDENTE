# Skill: Authentication & Authorization

## Purpose
Implement secure auth flows following industry best practices.

## Rules

### JWT Handling
- Set short expiration for access tokens (15min–1h)
- Use refresh tokens (7d) stored server-side in a revocable token table
- Never store JWTs in localStorage for high-security apps — prefer httpOnly cookies
- Include only non-sensitive claims in the JWT payload (user ID, roles — never passwords)
- Validate both JWT signature AND token existence in the database on every request
- Implement token rotation: issue a new refresh token on each refresh

### Password Security
- Hash with bcrypt (cost factor 12+) or argon2id
- Enforce minimum 8 characters, check against breached password lists
- Never log passwords, tokens, or secrets — even in error messages
- Implement account lockout after 5 failed attempts with exponential backoff
- Use constant-time comparison for password/token verification

### Authorization
- Check permissions at the route/controller level via middleware
- Never rely on client-side role checks alone — always enforce server-side
- Use principle of least privilege — deny by default, allow explicitly
- Validate that users can only access/modify their own resources (object-level auth)
- Log all authorization failures for audit trails

### Session Management
- Invalidate all tokens on password change
- Provide "logout everywhere" functionality
- Set secure cookie flags: `httpOnly`, `secure`, `sameSite: 'strict'`
- Implement CSRF protection for cookie-based auth
- Clear all auth state on logout (client storage + server tokens)

### API Security
- Rate-limit authentication endpoints (login, register, password reset)
- Use HTTPS exclusively — redirect HTTP to HTTPS
- Implement CORS with explicit allowed origins, never `*` in production
- Return generic error messages on auth failure ("Invalid credentials" not "User not found")
