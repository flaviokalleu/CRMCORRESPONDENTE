# Skill: Monitoring & Observability

## Purpose
Ensure application health visibility through logging, metrics, and alerting.

## Rules

### Structured Logging
```javascript
// Use structured JSON logging in production
const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  error: (message, error, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta
    }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  }
};
```

### What to Log
- All incoming requests: method, path, status code, response time
- Authentication events: login, logout, failed attempts, token refresh
- Business events: client created, payment processed, document uploaded
- Errors: with full stack trace, request context, and user ID
- External service calls: target, duration, status

### What NOT to Log
- Passwords, tokens, API keys, credit card numbers
- Full request/response bodies (can contain PII)
- Health check requests (creates noise)
- Repetitive success messages in tight loops

### Health Endpoint
```javascript
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

### Metrics to Track
- **Request rate**: requests per second by endpoint
- **Error rate**: 4xx and 5xx responses per minute
- **Response time**: p50, p95, p99 latencies
- **Database**: query duration, connection pool usage, slow queries (>1s)
- **System**: CPU usage, memory usage, disk space, active connections

### Alerting Rules
- Alert on: error rate > 5% for 5 minutes
- Alert on: response time p95 > 2 seconds for 5 minutes
- Alert on: database connection failures
- Alert on: disk usage > 85%
- Alert on: zero requests for 5 minutes (service may be down)
- Use escalation: warn -> page -> critical with increasing thresholds
