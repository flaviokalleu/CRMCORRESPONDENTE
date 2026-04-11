# Skill: CI/CD Pipelines

## Purpose
Automate build, test, and deployment processes for reliable and fast delivery.

## Rules

### GitHub Actions Pipeline
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: crmjs_test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm test
        env:
          DB_HOST: localhost
          DB_NAME: crmjs_test
          DB_PASSWORD: test
          JWT_SECRET_KEY: test-secret

  build:
    needs: lint-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/build/

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Deploy steps here"
```

### Pipeline Principles
- Fail fast: cheapest checks first (lint -> test -> build -> deploy)
- Cache dependencies aggressively (npm cache, Docker layers)
- Run independent jobs in parallel
- Use environment-specific secrets in GitHub/CI provider
- Never store secrets in pipeline files — use secret management

### Deployment Strategy
- **Staging**: auto-deploy on merge to develop/staging branch
- **Production**: auto-deploy on merge to main (or manual trigger)
- Run database migrations as part of deployment, before app restart
- Implement health checks — don't route traffic until healthy
- Support rollback: keep previous version's artifacts/images available

### Monitoring Post-Deploy
- Verify health endpoint responds after deployment
- Check error rate in first 5 minutes (canary period)
- Notify team on successful deployment with version/commit info
- Auto-rollback if error rate exceeds threshold
