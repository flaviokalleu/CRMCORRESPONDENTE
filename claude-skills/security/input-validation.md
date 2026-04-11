# Skill: Input Validation & Sanitization

## Purpose
Prevent injection attacks and data corruption through rigorous input handling.

## Rules

### Validation Principles
- Validate all input at system boundaries: API endpoints, form submissions, file uploads
- Use allowlists over denylists — define what IS valid, not what isn't
- Validate on the server even if the client already validates
- Return specific validation error messages with field names
- Reject the entire request on validation failure, don't partially process

### SQL Injection Prevention
- Always use parameterized queries or ORM methods — never string concatenation
- Use Sequelize model methods (`findAll`, `create`, `update`) with proper where clauses
- When raw SQL is unavoidable, use `sequelize.query(sql, { replacements: {} })`
- Never interpolate user input into `sequelize.literal()` or `Sequelize.fn()`
- Validate and cast types before using in queries (e.g., `parseInt` for IDs)

### XSS Prevention
- React auto-escapes JSX output — never bypass with `dangerouslySetInnerHTML`
- Sanitize HTML content with DOMPurify before rendering if rich text is required
- Set `Content-Security-Policy` headers to restrict script sources
- Encode user data in URL parameters with `encodeURIComponent`
- Never construct HTML strings from user input on the server

### Command Injection Prevention
- Never pass user input to `exec`, `spawn`, or shell commands
- If shell execution is unavoidable, use `execFile` with argument arrays (no shell interpolation)
- Validate file paths to prevent directory traversal (`../`)
- Use `path.resolve` and verify the result is within the expected directory

### File Upload Security
- Validate MIME type by reading file headers, not just the extension
- Limit file sizes (configure Multer's `limits.fileSize`)
- Store uploads outside the web root or behind an auth-checked route
- Generate random filenames — never use the original filename directly
- Scan uploaded files for malware in high-security contexts

### Data Type Enforcement
- Parse and validate: numbers (`parseInt`/`parseFloat` + `isNaN` check), dates, emails, UUIDs
- Use validation libraries (Joi, Yup, Zod) for complex object validation
- Trim whitespace from string inputs
- Enforce maximum lengths on all string fields
- Reject unexpected fields — don't blindly pass `req.body` to database operations
