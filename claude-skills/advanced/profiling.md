# Skill: Performance Profiling

## Purpose
Identify and resolve performance bottlenecks through measurement, not guesswork.

## Rules

### Profiling Workflow
1. **Measure**: Establish baseline performance numbers
2. **Identify**: Find the bottleneck (usually 1-2 hot spots cause 80% of slowness)
3. **Hypothesize**: Form a theory about why it's slow
4. **Optimize**: Make a targeted change
5. **Measure again**: Confirm improvement with same methodology
6. **Repeat**: Until performance meets requirements

### Backend Profiling

**Request Timing Middleware**
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});
```

**Database Query Profiling**
```javascript
// Log slow queries
sequelize.options.logging = (sql, timing) => {
  if (timing > 500) {
    console.warn(`Slow query (${timing}ms): ${sql}`);
  }
};

// Enable query timing
const sequelize = new Sequelize(config, {
  benchmark: true,
  logging: (sql, timing) => { /* ... */ }
});
```

**Memory Profiling**
```javascript
// Log memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`
  });
}, 60000);
```

### Frontend Profiling
- React DevTools Profiler: identify unnecessary re-renders
- Chrome Performance tab: measure paint, layout, scripting time
- Lighthouse: automated performance scoring with actionable suggestions
- Network tab: identify slow API calls and large payloads
- Bundle analyzer: find oversized dependencies

### Common Bottlenecks
| Symptom | Likely Cause | Fix |
|---|---|---|
| Slow page load | Large bundle size | Code splitting, lazy loading |
| Slow API response | N+1 queries | Eager loading, batch queries |
| High memory usage | Unclosed connections/listeners | Cleanup on close/unmount |
| Slow list rendering | Too many DOM nodes | Virtualization |
| Slow form submission | Synchronous file processing | Async processing, queues |
| Database timeouts | Missing indexes | Add indexes on queried columns |

### Benchmarking Rules
- Measure 3+ times, use median (not average)
- Test with realistic data volume (not 5 records — use 10,000+)
- Profile in production-like environment, not dev mode
- Measure one change at a time to attribute improvement correctly
- Document before/after numbers in commit messages
