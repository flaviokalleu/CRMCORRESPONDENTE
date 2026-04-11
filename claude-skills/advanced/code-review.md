# Skill: Code Review

## Purpose
Provide thorough, constructive code reviews that catch bugs, improve quality, and share knowledge.

## Rules

### Review Checklist

**Correctness**
- Does the code do what it's supposed to do?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths handled appropriately?
- Does it work for all user roles (admin, corretor, correspondente)?
- Are database transactions used for multi-step mutations?

**Security**
- Is user input validated and sanitized?
- Are SQL queries parameterized (no string concatenation)?
- Is authorization checked (not just authentication)?
- Are secrets kept out of code and logs?
- Is file upload validated (type, size, path)?

**Performance**
- Any N+1 query patterns?
- Are large lists paginated?
- Are expensive operations cached or memoized?
- Are database indexes in place for new queries?
- Is there unnecessary data fetching (SELECT * or unused includes)?

**Maintainability**
- Is the code readable without comments?
- Are functions focused (single responsibility)?
- Is there unnecessary duplication?
- Does it follow existing patterns in the codebase?
- Are naming conventions consistent?

**Testing**
- Are new features covered by tests?
- Do tests verify behavior, not implementation?
- Are error cases tested?
- Are mocks appropriate and realistic?

### Review Communication
- Prefix comments with severity:
  - `[blocking]` — must fix before merge
  - `[suggestion]` — would improve but not required
  - `[question]` — need clarification to review properly
  - `[nit]` — minor style/preference, completely optional
- Explain WHY something should change, not just WHAT
- Offer a concrete suggestion or code snippet when possible
- Acknowledge good patterns and clever solutions
- Keep tone constructive — review the code, not the person

### Auto-Review Focus Areas (this project)
- `valor_renda` used without CAST in SQL aggregations
- Components defined inside other components (remounting issue)
- Missing `authenticateToken` middleware on new routes
- `req.body` passed directly to Sequelize without validation
- Missing error handling in async route handlers
- Hardcoded strings that should be environment variables
