# Skill: Docker & Containerization

## Purpose
Build efficient, secure, and reproducible container images for development and production.

## Rules

### Dockerfile Best Practices
```dockerfile
# Use specific version tags, never :latest
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json package-lock.json ./

# Install dependencies in a separate layer
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:8000/api/health || exit 1

# Start command
CMD ["node", "src/server.js"]
```

### Multi-Stage Builds
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/package*.json ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "${PORT:-8000}:8000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME:-crmjs}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Security
- Never run containers as root — use `USER node` or create a non-root user
- Don't store secrets in images — use environment variables or Docker secrets
- Scan images for vulnerabilities with `docker scout` or `trivy`
- Use `.dockerignore` to exclude `node_modules`, `.env`, `.git`, `uploads/`
- Pin base image versions to specific digests for reproducibility

### Performance
- Order Dockerfile instructions from least to most frequently changing (maximize cache hits)
- Use `npm ci` instead of `npm install` (faster, deterministic)
- Use Alpine-based images for smaller footprint
- Clean up package manager caches in the same layer as install
- Use multi-stage builds to keep production images lean
