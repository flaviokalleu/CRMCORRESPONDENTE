# Skill: Error Handling

## Purpose
Handle errors consistently, informatively, and securely across the backend.

## Rules

### Error Classification
- **Operational errors**: Expected failures (invalid input, not found, auth failure, network timeout)
  - Handle gracefully, return appropriate HTTP status, log at `warn` level
- **Programmer errors**: Bugs (null reference, type errors, missing env vars)
  - Log at `error` level with full stack trace, return 500 with generic message

### Express Error Handling Pattern
```javascript
// Async route handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Route usage
router.get('/clientes/:id', asyncHandler(async (req, res) => {
  const cliente = await ClienteService.findById(req.params.id);
  if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ data: cliente });
}));

// Global error handler (last middleware)
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  const message = status === 500 ? 'Erro interno do servidor' : err.message;
  res.status(status).json({ error: message });
});
```

### Custom Error Classes
```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404);
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super('Dados inválidos', 400);
    this.details = details;
  }
}
```

### Logging Rules
- Log: timestamp, error type, message, stack trace, request ID, user ID
- Never log: passwords, tokens, credit card numbers, full CPF
- Use structured logging (JSON format) for production
- Include correlation IDs for tracing requests across services
- Log at appropriate levels: `error` > `warn` > `info` > `debug`

### Response Rules
- Never expose stack traces to the client in production
- Return errors in Portuguese for user-facing messages
- Include field-level details for validation errors
- Use consistent error response shape across all endpoints
- Return `error` key (not `message` alone) for machine parsing

### Database Error Handling
- Catch `SequelizeUniqueConstraintError` -> 409 Conflict
- Catch `SequelizeValidationError` -> 400 with field details
- Catch `SequelizeForeignKeyConstraintError` -> 400 with relationship info
- Catch `SequelizeConnectionError` -> 503 Service Unavailable, retry
- Always rollback transactions in catch blocks
