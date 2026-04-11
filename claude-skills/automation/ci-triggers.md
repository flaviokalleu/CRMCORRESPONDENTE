# Skill: CI Triggers & Pipeline Automation

## Purpose
Define reliable, fast CI/CD triggers that catch issues early without wasting resources.

## Rules

### Trigger Strategy
- **On push to feature branches**: lint, type-check, unit tests
- **On pull request**: full test suite, build verification, security scan
- **On merge to main**: build, deploy to staging, integration tests
- **On release tag**: build, deploy to production, smoke tests
- **Scheduled (nightly)**: dependency audit, full E2E suite, performance benchmarks

### Pipeline Stages (in order)
1. **Install**: `npm ci` (not `npm install` — uses lockfile exactly)
2. **Lint & Format**: ESLint, Prettier check (fail-fast, cheapest check)
3. **Type Check**: TypeScript compilation (if applicable)
4. **Unit Tests**: Jest with coverage threshold
5. **Build**: Production build to verify it compiles
6. **Integration Tests**: Tests against real database
7. **Security Scan**: `npm audit`, SAST tools
8. **Deploy**: To appropriate environment based on trigger

### Performance Rules
- Cache `node_modules` between runs (key on lockfile hash)
- Run independent stages in parallel (lint + test + type-check)
- Use fail-fast: stop pipeline on first failure
- Skip unnecessary stages (don't run E2E on docs-only changes)
- Keep total pipeline under 10 minutes for feature branches

### Notifications
- Notify on failure: Slack/email to PR author
- Notify on recovery: when a previously failing pipeline passes
- Don't notify on every success — it becomes noise
- Include: branch name, commit message, failure stage, link to logs
