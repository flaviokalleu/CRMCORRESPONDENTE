# Skill: Script Development

## Purpose
Write reliable, portable automation scripts for development and deployment tasks.

## Rules

### Script Structure
- Start with a clear purpose comment
- Validate prerequisites before executing (required tools, env vars, permissions)
- Use meaningful exit codes: 0 success, 1 general error, 2 usage error
- Accept arguments for configurable behavior, provide sensible defaults
- Print usage/help when invoked with `--help` or incorrect arguments

### Shell Scripts
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Validate prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }

# Use variables for repeated values
DB_NAME="${DB_NAME:-crmjs}"
BACKUP_DIR="./backups/$(date +%Y%m%d)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Main logic
echo "Backing up database: $DB_NAME"
pg_dump "$DB_NAME" > "$BACKUP_DIR/$DB_NAME.sql"
echo "Backup completed: $BACKUP_DIR/$DB_NAME.sql"
```

### Node.js Scripts
```javascript
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node script.js [options]');
  process.exit(0);
}

// Use try/catch for error handling
try {
  // Script logic here
  console.log('Done.');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

### Best Practices
- Idempotent: running a script twice produces the same result
- Log what's happening at each step for debuggability
- Use `set -euo pipefail` in bash scripts
- Quote all variables to handle spaces in paths
- Use `mktemp` for temporary files, clean up in a trap handler
- Test scripts in a safe environment before running on production data

### Common Automation Scripts
- **Database backup/restore**: Scheduled pg_dump with rotation
- **Log rotation**: Archive and compress old log files
- **Dependency audit**: `npm audit` with CI failure on critical vulnerabilities
- **Environment setup**: Install dependencies, create .env from template, run migrations
- **Release**: Tag version, build, deploy, notify
