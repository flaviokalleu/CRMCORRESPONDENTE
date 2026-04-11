# Skill: Performance Optimization

## Purpose
Write performant code by default and identify optimization opportunities when relevant.

## Rules

### Database Performance
- Add indexes for columns used in WHERE, JOIN, ORDER BY clauses
- Use `SELECT` only the columns you need, never `SELECT *` in production code
- Batch inserts/updates instead of looping single operations
- Use database-level pagination (`LIMIT`/`OFFSET` or cursor-based)
- Prefer single queries with JOINs over multiple sequential queries
- Cache frequently accessed, rarely changing data (config, lookup tables)

### API Performance
- Implement response compression (gzip/brotli)
- Use HTTP caching headers for static and semi-static resources
- Return only the fields the client needs — support field selection or use DTOs
- Implement request debouncing/throttling on the client side
- Use connection pooling for database and external service connections

### Frontend Performance
- Lazy load routes and heavy components with `React.lazy` + `Suspense`
- Memoize expensive computations with `useMemo`, callbacks with `useCallback`
- Avoid inline object/array creation in JSX props (causes unnecessary re-renders)
- Use virtualized lists for rendering 100+ items
- Optimize images: use WebP, implement lazy loading, provide width/height
- Code-split vendor libraries that are only used on specific pages

### Memory Management
- Close database connections, streams, and file handles when done
- Remove event listeners on component unmount or scope exit
- Avoid closures that capture large objects unnecessarily
- Use streaming for large file uploads/downloads instead of buffering in memory
- Set reasonable TTLs on cached data to prevent memory leaks

### Algorithmic Awareness
- Use Map/Set for O(1) lookups instead of Array.find/includes for large collections
- Avoid nested loops on large datasets — consider indexing or restructuring
- Use generators/iterators for processing large sequences lazily
- Prefer `for...of` or `forEach` over `for...in` for arrays
