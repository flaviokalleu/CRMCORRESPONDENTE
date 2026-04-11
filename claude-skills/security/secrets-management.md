# Skill: Secrets Management

## Purpose
Keep credentials, API keys, and sensitive configuration secure throughout the development lifecycle.

## Rules

### Storage
- Store all secrets in environment variables, never in source code
- Use `.env` files for local development only — never commit them
- Ensure `.env` is in `.gitignore` before creating it
- Provide a `.env.example` with placeholder values for documentation
- In production, use platform-provided secret management (AWS SSM, Vault, Docker secrets)

### Git Safety
- Before every commit, verify no secrets are staged (`git diff --cached`)
- If a secret is accidentally committed, rotate it immediately — git history is permanent
- Use `git-secrets` or `gitleaks` as pre-commit hooks to catch leaks
- Never store secrets in CLAUDE.md, README, or any documentation file
- Don't log environment variables at startup — log only that they are set/unset

### Key Practices
- Use different secrets per environment (dev, staging, production)
- Rotate secrets on a regular schedule (90 days for API keys)
- Use least-privilege API keys — scope to only the permissions needed
- Encrypt secrets at rest when stored in databases
- Never pass secrets as URL query parameters — they appear in logs

### Code Patterns
```javascript
// CORRECT: Read from environment
const apiKey = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!apiKey) throw new Error('MERCADO_PAGO_ACCESS_TOKEN is required');

// WRONG: Hardcoded secret
const apiKey = 'APP_USR-12345-abcdef';
```

### Audit
- Log access to secret-management systems
- Monitor for exposed secrets in public repositories
- Document which services use which secrets
- Maintain a rotation runbook for each secret type
