# Skill: Workflow Automation

## Purpose
Automate repetitive development tasks to increase productivity and reduce human error.

## Rules

### Git Hooks
- **pre-commit**: Run linter and formatter on staged files only (use lint-staged)
- **commit-msg**: Validate commit message format (conventional commits)
- **pre-push**: Run type-check and fast tests
- Use Husky for managing Git hooks in Node.js projects
- Keep hooks fast (under 10 seconds) — move slow checks to CI

### NPM Scripts
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write 'src/**/*.{js,jsx,json}'",
    "migrate": "sequelize db:migrate --config src/config/database.js",
    "migrate:undo": "sequelize db:migrate:undo --config src/config/database.js",
    "seed": "sequelize db:seed:all --config src/config/database.js",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Code Generation
- Generate boilerplate for new models, routes, and services from templates
- Include migration file when generating a new model
- Follow existing naming conventions in the project
- Generate with minimal viable code — let the developer fill in business logic

### Automation Patterns
- Database backup before migration runs
- Auto-restart dev server on file changes (nodemon)
- Auto-format on save (editor integration)
- Auto-generate API documentation from route definitions
- Health check endpoint for monitoring: `GET /api/health`

### Task Runners
- Use npm scripts as the single entry point for all tasks
- Compose complex tasks from simple ones using `&&` (sequential) or `&` (parallel)
- Document all scripts in README or package.json description fields
- Keep scripts cross-platform compatible (avoid bash-specific syntax in npm scripts)
