# Skill: Debugging

## Purpose
Systematically diagnose and resolve bugs with minimal time and maximum confidence.

## Rules

### Debugging Process
1. **Reproduce**: Confirm you can trigger the bug consistently
2. **Isolate**: Narrow down to the smallest code path that exhibits the issue
3. **Understand**: Read the error message, stack trace, and relevant code
4. **Hypothesize**: Form a theory about the root cause
5. **Verify**: Test your hypothesis with a targeted change
6. **Fix**: Apply the minimal fix that addresses the root cause
7. **Validate**: Confirm the fix resolves the issue without regressions

### Reading Error Messages
- Start from the bottom of the stack trace (the actual error)
- Identify the first line from YOUR code (not node_modules)
- Note the error type: TypeError (wrong type), ReferenceError (undefined variable), SyntaxError (parse error)
- Check if it's a runtime or compile-time error
- Search for the exact error message if unfamiliar

### Common Node.js/Express Issues
```
"Cannot read properties of undefined (reading 'id')"
-> Check: Is the object null? Is the property name correct? Is async data loaded?

"SequelizeUniqueConstraintError"
-> Check: Duplicate entry on unique column. Which field? Was it validated before insert?

"JsonWebTokenError: invalid signature"
-> Check: Are you using the same JWT_SECRET_KEY for signing and verifying?

"ECONNREFUSED 127.0.0.1:5432"
-> Check: Is PostgreSQL running? Correct host/port in .env?

"req.user is undefined"
-> Check: Is authenticateToken middleware applied to this route?
```

### Common React Issues
```
"Objects are not valid as a React child"
-> Check: Rendering an object/array directly? Use .map() or JSON.stringify()

"Too many re-renders"
-> Check: State update in render body? useEffect without dependency array?

"Cannot update a component while rendering a different component"
-> Check: Calling setState in another component's render. Move to useEffect.

Stale closure in useEffect
-> Check: Missing dependencies in dep array. Or use functional state updates.
```

### Debugging Tools
- `console.log` with labels: `console.log('>>> user:', user)` for quick checks
- `debugger` statement + Chrome DevTools for step-through
- Network tab for API request/response inspection
- React DevTools for component tree and state inspection
- `sequelize.options.logging = console.log` for SQL query inspection
- `DEBUG=express:*` environment variable for Express routing debugging

### Fix Validation
- Verify the fix solves the reported issue
- Check related functionality hasn't broken
- Test edge cases around the fix
- Ensure error handling is in place for the failure mode
- Remove debugging statements before committing
